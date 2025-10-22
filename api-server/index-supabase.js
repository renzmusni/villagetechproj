const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import Supabase database
const { supabase, testConnection, initializeDatabase } = require('./database');

// Import error handling middleware
const {
  errorHandler,
  asyncHandler,
  validate,
  requestLogger,
  rateLimit,
  sanitizeInput
} = require('./middleware/errorHandler');

// Import WebSocket server
const SocketServer = require('./websocket/socketServer');

// Import caching system
const { getCacheManager, cacheMiddleware } = require('./cache/cacheManager');

const app = express();
const PORT = process.env.PORT || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(sanitizeInput);
app.use(requestLogger);

// Rate limiting for sensitive endpoints
app.use('/api/auth', rateLimit(5, 15 * 60 * 1000)); // 5 requests per 15 minutes for auth
app.use('/api/security-incidents', rateLimit(50, 15 * 60 * 1000)); // 50 requests per 15 minutes for security incidents

// Initialize cache manager
const cache = getCacheManager({
  enableRedis: process.env.NODE_ENV === 'production',
  redisUrl: process.env.REDIS_URL,
  defaultTtl: 300000, // 5 minutes
  maxSize: 2000
});

// Add caching middleware for read-heavy endpoints
app.use('/api/users', cacheMiddleware({
  ttl: 600000, // 10 minutes
  keyGenerator: (req) => cache.keys.user(req.user?.id, { tenant: req.user?.tenantId }),
  condition: (cached) => cached.data?.id === req.params.id || req.query?.id,
  invalidateOnMutation: true
}));

app.use('/api/households', cacheMiddleware({
  ttl: 300000, // 5 minutes
  keyGenerator: (req) => cache.keys.household(req.params?.id, { tenant: req.user?.tenantId }),
  condition: (cached) => cached.data?.id === req.params?.id || req.query?.id,
  invalidateOnMutation: true
}));

app.use('/api/security-incidents', cacheMiddleware({
  ttl: 120000, // 2 minutes for incidents (need fresh data)
  keyGenerator: (req) => cache.keys.statistics('incidents', { tenant: req.user?.tenantId }),
  invalidateOnMutation: true
}));

app.use('/api/deliveries', cacheMiddleware({
  ttl: 180000, // 3 minutes for deliveries
  keyGenerator: (req) => cache.keys.search(req.query?.toString(), { tenant: req.user?.tenantId }),
  invalidateOnMutation: true
}));

app.use('/api/announcements', cacheMiddleware({
  ttl: 600000, // 10 minutes
  keyGenerator: (req) => cache.keys.announcement(req.params?.id, { tenant: req.user?.tenantId }),
  condition: (cached) => cached.data?.id === req.params?.id || req.query?.id,
  invalidateOnMutation: true
}));

app.use('/api/payments', cacheMiddleware({
  ttl: 300000, // 5 minutes
  keyGenerator: (req) => cache.keys.payment(req.params?.id, { tenant: req.user?.tenantId }),
  condition: (cached) => cached.data?.id === req.params?.id || req.query?.id,
  invalidateOnMutation: true
}));

// JWT token generation
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();

    if (!connected) {
      console.log('🔧 Setting up database tables...');
      await initializeDatabase();
    }

    // Health Check
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        message: 'HOA API Server is running',
        database: connected ? 'connected' : 'using in-memory fallback',
        timestamp: new Date().toISOString()
      });
    });

    // Auth Routes
    app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: 'Email and password are required'
          });
        }

        let user;

        if (connected) {
          // Try Supabase first
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single();

          if (error || !userData) {
            return res.status(401).json({
              success: false,
              message: 'Invalid email or password'
            });
          }
          user = userData;
        } else {
          // Fallback to in-memory data
          user = users.find(u => u.email === email && u.isActive);
          if (!user) {
            return res.status(401).json({
              success: false,
              message: 'Invalid email or password'
            });
          }
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        const token = generateToken(user);

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              firstName: user.first_name,
              lastName: user.last_name,
              tenantId: user.tenant_id
            },
            token
          }
        });

      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/user/profile', authenticateToken, async (req, res) => {
      try {
        let user;

        if (connected) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('id, email, role, first_name, last_name, tenant_id, is_active')
            .eq('id', req.user.id)
            .single();

          if (error || !userData) {
            return res.status(404).json({
              success: false,
              message: 'User not found'
            });
          }
          user = userData;
        } else {
          user = users.find(u => u.id === req.user.id);
        }

        res.json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            tenantId: user.tenant_id,
            isActive: user.is_active
          }
        });

      } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Announcements Routes
    app.get('/api/announcements', async (req, res) => {
      try {
        const { page = 1, limit = 10, published, tenantId } = req.query;

        let query = supabase
          .from('announcements')
          .select(`
            *,
            author:users!announcements_author_id_fkey(
              id, first_name, last_name, email
            )
          `);

        if (published !== undefined) {
          query = query.eq('published', published === 'true');
        }
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Announcements error:', error);
          // Fallback to in-memory data
          return res.json({
            success: true,
            data: announcements,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: announcements.length
            }
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Announcements error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Public Announcements (for residents)
    app.get('/api/public/announcements', async (req, res) => {
      try {
        const { limit = 10, priority, tenantId } = req.query;

        let query = supabase
          .from('announcements')
          .select(`
            *,
            author:users!announcements_author_id_fkey(
              id, first_name, last_name
            )
          `)
          .eq('published', true);

        if (priority) {
          const priorities = priority.split(',');
          query = query.in('priority', priorities);
        }
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }

        const { data, error } = await query
          .limit(parseInt(limit))
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Public announcements error:', error);
          // Fallback to in-memory data
          const publishedAnnouncements = announcements.filter(a => a.published);
          return res.json({
            success: true,
            data: publishedAnnouncements
          });
        }

        res.json({
          success: true,
          data: data || []
        });

      } catch (error) {
        console.error('Public announcements error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Communities Routes
    app.get('/api/communities', async (req, res) => {
      try {
        const { page = 1, limit = 10, search } = req.query;

        let query = supabase
          .from('communities')
          .select('*', { count: 'exact' });

        if (search) {
          query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Communities error:', error);
          // Fallback to in-memory data
          return res.json({
            success: true,
            data: communities,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: communities.length
            }
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Communities error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Households Routes
    app.get('/api/households', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, communityId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('households')
          .select(`
            *,
            residences:residence_id(address, unit_number),
            users:household_users(
              user_id,
              users(first_name, last_name, email, role, phone)
            )
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`residences.address.ilike.%${search}%,residences.unit_number.ilike.%${search}%`);
        }

        if (communityId) {
          query = query.eq('community_id', communityId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Households error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch households'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Households error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/households', authenticateToken, async (req, res) => {
      try {
        const {
          residenceId,
          communityId,
          householdHeadId,
          name,
          contactEmail,
          contactPhone,
          emergencyContact
        } = req.body;

        const tenantId = req.user.tenantId;

        // Validate required fields
        if (!residenceId || !communityId || !householdHeadId || !name || !contactEmail) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Create household
        const { data, error } = await supabase
          .from('households')
          .insert([{
            residence_id: residenceId,
            community_id: communityId,
            tenant_id: tenantId,
            household_head_id: householdHeadId,
            name,
            contact_email: contactEmail,
            contact_phone: contactPhone,
            emergency_contact: emergencyContact,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create household error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create household'
          });
        }

        // Add household head as member
        await supabase
          .from('household_users')
          .insert([{
            household_id: data.id,
            user_id: householdHeadId,
            role: 'household-head',
            is_active: true,
            joined_at: new Date()
          }]);

        res.status(201).json({
          success: true,
          data: data,
          message: 'Household created successfully'
        });

      } catch (error) {
        console.error('Create household error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/households/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const {
          name,
          contactEmail,
          contactPhone,
          emergencyContact,
          isActive
        } = req.body;

        const tenantId = req.user.tenantId;

        // Verify household belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('households')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Household not found'
          });
        }

        const updateData = {
          updated_at: new Date()
        };

        if (name) updateData.name = name;
        if (contactEmail) updateData.contact_email = contactEmail;
        if (contactPhone) updateData.contact_phone = contactPhone;
        if (emergencyContact !== undefined) updateData.emergency_contact = emergencyContact;
        if (isActive !== undefined) updateData.is_active = isActive;

        const { data, error } = await supabase
          .from('households')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Update household error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update household'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Household updated successfully'
        });

      } catch (error) {
        console.error('Update household error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/households/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify household belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('households')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Household not found'
          });
        }

        // Soft delete - deactivate household
        const { error } = await supabase
          .from('households')
          .update({
            is_active: false,
            updated_at: new Date()
          })
          .eq('id', id);

        if (error) {
          console.error('Delete household error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete household'
          });
        }

        res.json({
          success: true,
          message: 'Household deleted successfully'
        });

      } catch (error) {
        console.error('Delete household error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Household Members Routes
    app.get('/api/households/:id/members', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify household belongs to tenant
        const { data: household, error: checkError } = await supabase
          .from('households')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !household) {
          return res.status(404).json({
            success: false,
            message: 'Household not found'
          });
        }

        // Get household members
        const { data, error } = await supabase
          .from('household_users')
          .select(`
            *,
            users(id, first_name, last_name, email, phone, role)
          `)
          .eq('household_id', id)
          .eq('is_active', true)
          .order('joined_at', { ascending: true });

        if (error) {
          console.error('Household members error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch household members'
          });
        }

        res.json({
          success: true,
          data: data || []
        });

      } catch (error) {
        console.error('Household members error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/households/:id/members', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { userId, role } = req.body;
        const tenantId = req.user.tenantId;

        // Validate required fields
        if (!userId || !role) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Verify household belongs to tenant
        const { data: household, error: checkError } = await supabase
          .from('households')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !household) {
          return res.status(404).json({
            success: false,
            message: 'Household not found'
          });
        }

        // Check if user exists and belongs to tenant
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (userError || !user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Add household member
        const { data, error } = await supabase
          .from('household_users')
          .insert([{
            household_id: id,
            user_id: userId,
            role,
            is_active: true,
            joined_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Add household member error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to add household member'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Household member added successfully'
        });

      } catch (error) {
        console.error('Add household member error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Vehicles Routes
    app.get('/api/vehicles', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, householdId, status } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('vehicles')
          .select(`
            *,
            households:household_id(name, contact_email),
            users:owner_id(first_name, last_name, email, phone)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,license_plate.ilike.%${search}%`);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Vehicles error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch vehicles'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Vehicles error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/vehicles', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          ownerId,
          make,
          model,
          year,
          color,
          licensePlate,
          vehicleType,
          stickerNumber,
          stickerExpiry,
          parkingSpot
        } = req.body;

        const tenantId = req.user.tenantId;

        // Validate required fields
        if (!householdId || !ownerId || !make || !model || !licensePlate) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Check if license plate already exists
        const { data: existingPlate, error: plateError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('license_plate', licensePlate.toUpperCase())
          .eq('tenant_id', tenantId)
          .single();

        if (existingPlate && !plateError) {
          return res.status(400).json({
            success: false,
            message: 'License plate already registered'
          });
        }

        // Generate unique sticker number if not provided
        let finalStickerNumber = stickerNumber;
        if (!finalStickerNumber) {
          const { data: maxSticker } = await supabase
            .from('vehicles')
            .select('sticker_number')
            .eq('tenant_id', tenantId)
            .not('sticker_number', 'is', null)
            .order('sticker_number', { ascending: false })
            .limit(1)
            .single();

          const nextNumber = maxSticker ? parseInt(maxSticker.sticker_number) + 1 : 1001;
          finalStickerNumber = nextNumber.toString();
        }

        // Create vehicle
        const { data, error } = await supabase
          .from('vehicles')
          .insert([{
            household_id: householdId,
            owner_id: ownerId,
            tenant_id: tenantId,
            make,
            model,
            year: parseInt(year) || null,
            color,
            license_plate: licensePlate.toUpperCase(),
            vehicle_type: vehicleType || 'car',
            sticker_number: finalStickerNumber,
            sticker_expiry: stickerExpiry || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            parking_spot: parkingSpot,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create vehicle error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create vehicle'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Vehicle registered successfully'
        });

      } catch (error) {
        console.error('Create vehicle error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/vehicles/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const {
          make,
          model,
          year,
          color,
          licensePlate,
          vehicleType,
          stickerNumber,
          stickerExpiry,
          parkingSpot,
          status
        } = req.body;

        const tenantId = req.user.tenantId;

        // Verify vehicle belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found'
          });
        }

        // Check if license plate already exists (if changing)
        if (licensePlate && licensePlate !== existing.license_plate) {
          const { data: existingPlate, error: plateError } = await supabase
            .from('vehicles')
            .select('*')
            .eq('license_plate', licensePlate.toUpperCase())
            .eq('tenant_id', tenantId)
            .neq('id', id)
            .single();

          if (existingPlate && !plateError) {
            return res.status(400).json({
              success: false,
              message: 'License plate already registered'
            });
          }
        }

        const updateData = {
          updated_at: new Date()
        };

        if (make) updateData.make = make;
        if (model) updateData.model = model;
        if (year) updateData.year = parseInt(year);
        if (color !== undefined) updateData.color = color;
        if (licensePlate) updateData.license_plate = licensePlate.toUpperCase();
        if (vehicleType) updateData.vehicle_type = vehicleType;
        if (stickerNumber) updateData.sticker_number = stickerNumber;
        if (stickerExpiry) updateData.sticker_expiry = stickerExpiry;
        if (parkingSpot !== undefined) updateData.parking_spot = parkingSpot;
        if (status) updateData.status = status;

        const { data, error } = await supabase
          .from('vehicles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Update vehicle error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update vehicle'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Vehicle updated successfully'
        });

      } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/vehicles/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify vehicle belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found'
          });
        }

        // Soft delete - deactivate vehicle
        const { error } = await supabase
          .from('vehicles')
          .update({
            status: 'inactive',
            updated_at: new Date()
          })
          .eq('id', id);

        if (error) {
          console.error('Delete vehicle error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete vehicle'
          });
        }

        res.json({
          success: true,
          message: 'Vehicle deleted successfully'
        });

      } catch (error) {
        console.error('Delete vehicle error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/vehicles/:id/renew-sticker', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { expiryDate } = req.body;
        const tenantId = req.user.tenantId;

        // Verify vehicle belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found'
          });
        }

        // Generate new sticker number
        const { data: maxSticker } = await supabase
          .from('vehicles')
          .select('sticker_number')
          .eq('tenant_id', tenantId)
          .not('sticker_number', 'is', null)
          .order('sticker_number', { ascending: false })
          .limit(1)
          .single();

        const nextNumber = maxSticker ? parseInt(maxSticker.sticker_number) + 1 : 1001;
        const newStickerNumber = nextNumber.toString();

        // Update vehicle with new sticker
        const updateData = {
          sticker_number: newStickerNumber,
          sticker_expiry: expiryDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: 'active',
          updated_at: new Date()
        };

        const { data, error } = await supabase
          .from('vehicles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Renew sticker error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to renew sticker'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Vehicle sticker renewed successfully'
        });

      } catch (error) {
        console.error('Renew sticker error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Guests Routes
    app.get('/api/guests', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, status, householdId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('guests')
          .select(`
            *,
            households:household_id(name, contact_email),
            users:host_id(first_name, last_name, email, phone)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Guests error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch guests'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Guests error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/guests', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          hostId,
          firstName,
          lastName,
          email,
          phone,
          purpose,
          visitType,
          startDate,
          endDate,
          startTime,
          endTime,
          accessNotes,
          vehicleInfo
        } = req.body;

        const tenantId = req.user.tenantId;

        // Validate required fields
        if (!householdId || !hostId || !firstName || !lastName || !purpose || !visitType || !startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Generate unique QR code
        const qrCode = `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Calculate visit duration
        const startDateTime = new Date(`${startDate} ${startTime || '00:00'}`);
        const endDateTime = new Date(`${endDate} ${endTime || '23:59'}`);
        const duration = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60 * 24));

        // Create guest
        const { data, error } = await supabase
          .from('guests')
          .insert([{
            household_id: householdId,
            host_id: hostId,
            tenant_id: tenantId,
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            purpose,
            visit_type: visitType,
            start_date: startDate,
            end_date: endDate,
            start_time: startTime || '00:00',
            end_time: endTime || '23:59',
            access_notes: accessNotes,
            vehicle_info: vehicleInfo,
            qr_code: qrCode,
            status: 'active',
            duration_days: duration,
            access_count: 0,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create guest error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create guest'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Guest registered successfully'
        });

      } catch (error) {
        console.error('Create guest error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/guests/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const {
          firstName,
          lastName,
          email,
          phone,
          purpose,
          visitType,
          startDate,
          endDate,
          startTime,
          endTime,
          accessNotes,
          vehicleInfo,
          status
        } = req.body;

        const tenantId = req.user.tenantId;

        // Verify guest belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('guests')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Guest not found'
          });
        }

        const updateData = {
          updated_at: new Date()
        };

        if (firstName) updateData.first_name = firstName;
        if (lastName) updateData.last_name = lastName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (purpose) updateData.purpose = purpose;
        if (visitType) updateData.visit_type = visitType;
        if (startDate) updateData.start_date = startDate;
        if (endDate) updateData.end_date = endDate;
        if (startTime) updateData.start_time = startTime;
        if (endTime) updateData.end_time = endTime;
        if (accessNotes !== undefined) updateData.access_notes = accessNotes;
        if (vehicleInfo !== undefined) updateData.vehicle_info = vehicleInfo;
        if (status) updateData.status = status;

        const { data, error } = await supabase
          .from('guests')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Update guest error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update guest'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Guest updated successfully'
        });

      } catch (error) {
        console.error('Update guest error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/guests/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify guest belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('guests')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Guest not found'
          });
        }

        // Soft delete - deactivate guest
        const { error } = await supabase
          .from('guests')
          .update({
            status: 'cancelled',
            updated_at: new Date()
          })
          .eq('id', id);

        if (error) {
          console.error('Delete guest error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete guest'
          });
        }

        res.json({
          success: true,
          message: 'Guest deleted successfully'
        });

      } catch (error) {
        console.error('Delete guest error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/guests/:id/check-in', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { accessPoint } = req.body;
        const tenantId = req.user.tenantId;

        // Verify guest belongs to tenant
        const { data: guest, error: checkError } = await supabase
          .from('guests')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !guest) {
          return res.status(404).json({
            success: false,
            message: 'Guest not found'
          });
        }

        // Check if guest is still valid
        const now = new Date();
        const startDate = new Date(guest.start_date);
        const endDate = new Date(guest.end_date);

        if (now < startDate || now > endDate || guest.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: 'Guest access is not valid'
          });
        }

        // Update access count and last access
        const { data, error } = await supabase
          .from('guests')
          .update({
            access_count: guest.access_count + 1,
            last_access: new Date(),
            last_access_point: accessPoint,
            updated_at: new Date()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Check-in error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to check in guest'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Guest checked in successfully'
        });

      } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/guests/:id/qr-code', async (req, res) => {
      try {
        const { id } = req.params;

        // Get guest QR code without authentication (for scanning)
        const { data: guest, error } = await supabase
          .from('guests')
          .select(`
            id,
            qr_code,
            first_name,
            last_name,
            purpose,
            visit_type,
            start_date,
            end_date,
            status,
            households:household_id(name),
            users:host_id(first_name, last_name, phone)
          `)
          .eq('id', id)
          .single();

        if (error || !guest) {
          return res.status(404).json({
            success: false,
            message: 'Guest not found'
          });
        }

        // Check if QR code is still valid
        const now = new Date();
        const startDate = new Date(guest.start_date);
        const endDate = new Date(guest.end_date);

        const isValid = now >= startDate && now <= endDate && guest.status === 'active';

        res.json({
          success: true,
          data: {
            ...guest,
            is_valid: isValid
          }
        });

      } catch (error) {
        console.error('QR code error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Construction Permits Routes
    app.get('/api/construction-permits', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, status, householdId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('construction_permits')
          .select(`
            *,
            households:household_id(name, unit_number),
            users:requested_by(first_name, last_name, email)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,contractor_name.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Construction permits error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch construction permits'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Construction permits error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/construction-permits', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          title,
          description,
          workType,
          startDate,
          endDate,
          contractorName,
          contractorContact,
          contractorLicense,
          estimatedCost,
          specialRequirements,
          workAreas
        } = req.body;

        const tenantId = req.user.tenantId;
        const requestedBy = req.user.id;

        // Validate required fields
        if (!householdId || !title || !description || !workType || !startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Generate permit number
        const permitNumber = `PERMIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Calculate duration
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        // Create construction permit
        const { data, error } = await supabase
          .from('construction_permits')
          .insert([{
            tenant_id: tenantId,
            household_id: householdId,
            requested_by: requestedBy,
            permit_number: permitNumber,
            title,
            description,
            work_type: workType,
            start_date: startDate,
            end_date: endDate,
            duration_days: durationDays,
            contractor_name: contractorName,
            contractor_contact: contractorContact,
            contractor_license: contractorLicense,
            estimated_cost: estimatedCost,
            special_requirements: specialRequirements,
            work_areas: workAreas,
            status: 'pending',
            approved_by: null,
            approved_at: null,
            rejection_reason: null,
            inspection_notes: null,
            completion_notes: null,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create construction permit error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create construction permit'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Construction permit request submitted successfully'
        });

      } catch (error) {
        console.error('Create construction permit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/construction-permits/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const {
          title,
          description,
          workType,
          startDate,
          endDate,
          contractorName,
          contractorContact,
          contractorLicense,
          estimatedCost,
          specialRequirements,
          workAreas,
          status
        } = req.body;

        const tenantId = req.user.tenantId;

        // Verify permit belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('construction_permits')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Construction permit not found'
          });
        }

        const updateData = {
          updated_at: new Date()
        };

        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (workType) updateData.work_type = workType;
        if (startDate) updateData.start_date = startDate;
        if (endDate) updateData.end_date = endDate;
        if (contractorName) updateData.contractor_name = contractorName;
        if (contractorContact) updateData.contractor_contact = contractorContact;
        if (contractorLicense) updateData.contractor_license = contractorLicense;
        if (estimatedCost) updateData.estimated_cost = estimatedCost;
        if (specialRequirements !== undefined) updateData.special_requirements = specialRequirements;
        if (workAreas) updateData.work_areas = workAreas;
        if (status) updateData.status = status;

        // Recalculate duration if dates changed
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          updateData.duration_days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }

        const { data, error } = await supabase
          .from('construction_permits')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Update construction permit error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update construction permit'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Construction permit updated successfully'
        });

      } catch (error) {
        console.error('Update construction permit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/construction-permits/:id/approve', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { notes, approvedBy } = req.body;
        const tenantId = req.user.tenantId;

        // Verify permit belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('construction_permits')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Construction permit not found'
          });
        }

        // Approve permit
        const { data, error } = await supabase
          .from('construction_permits')
          .update({
            status: 'approved',
            approved_by: approvedBy || req.user.id,
            approved_at: new Date(),
            inspection_notes: notes,
            updated_at: new Date()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Approve construction permit error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to approve construction permit'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Construction permit approved successfully'
        });

      } catch (error) {
        console.error('Approve construction permit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/construction-permits/:id/reject', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { reason, rejectedBy } = req.body;
        const tenantId = req.user.tenantId;

        // Verify permit belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('construction_permits')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Construction permit not found'
          });
        }

        // Reject permit
        const { data, error } = await supabase
          .from('construction_permits')
          .update({
            status: 'rejected',
            approved_by: rejectedBy || req.user.id,
            approved_at: new Date(),
            rejection_reason: reason,
            updated_at: new Date()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Reject construction permit error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to reject construction permit'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Construction permit rejected'
        });

      } catch (error) {
        console.error('Reject construction permit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/construction-permits/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify permit belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('construction_permits')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Construction permit not found'
          });
        }

        // Only allow deletion of pending permits
        if (existing.status !== 'pending') {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete permit that is already processed'
          });
        }

        // Delete permit
        const { error } = await supabase
          .from('construction_permits')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete construction permit error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete construction permit'
          });
        }

        res.json({
          success: true,
          message: 'Construction permit deleted successfully'
        });

      } catch (error) {
        console.error('Delete construction permit error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Fees and Payments Routes
    app.get('/api/fees', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, status, type, householdId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('fees')
          .select(`
            *,
            households:household_id(name, unit_number),
            users:created_by(first_name, last_name, email)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,reference_number.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (type) {
          query = query.eq('type', type);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fees error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch fees'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Fees error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/fees', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          title,
          description,
          type,
          amount,
          dueDate,
          frequency,
          autoBill
        } = req.body;

        const tenantId = req.user.tenantId;
        const createdBy = req.user.id;

        // Validate required fields
        if (!householdId || !title || !type || !amount || !dueDate) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Generate reference number
        const referenceNumber = `FEE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create fee
        const { data, error } = await supabase
          .from('fees')
          .insert([{
            tenant_id: tenantId,
            household_id: householdId,
            reference_number: referenceNumber,
            title,
            description,
            type,
            amount: parseFloat(amount),
            due_date: dueDate,
            frequency: frequency || 'one-time',
            auto_bill: autoBill || false,
            status: 'pending',
            paid_amount: 0,
            created_by: createdBy,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create fee error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create fee'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Fee created successfully'
        });

      } catch (error) {
        console.error('Create fee error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/payments', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, status, method, householdId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('payments')
          .select(`
            *,
            households:household_id(name, unit_number),
            fees:fee_id(title, reference_number),
            users:processed_by(first_name, last_name, email)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`transaction_id.ilike.%${search}%,reference_number.ilike.%${search}%,notes.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (method) {
          query = query.eq('payment_method', method);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Payments error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Payments error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/payments', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          feeId,
          amount,
          paymentMethod,
          transactionId,
          notes
        } = req.body;

        const tenantId = req.user.tenantId;
        const processedBy = req.user.id;

        // Validate required fields
        if (!householdId || !amount || !paymentMethod) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Generate transaction ID if not provided
        const transactionId_final = transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        // Create payment
        const { data, error } = await supabase
          .from('payments')
          .insert([{
            tenant_id: tenantId,
            household_id: householdId,
            fee_id: feeId || null,
            transaction_id: transactionId_final,
            amount: parseFloat(amount),
            payment_method: paymentMethod,
            status: 'completed',
            notes,
            processed_by: processedBy,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create payment error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create payment'
          });
        }

        // Update fee paid amount if fee_id is provided
        if (feeId) {
          const { data: fee } = await supabase
            .from('fees')
            .select('paid_amount, amount')
            .eq('id', feeId)
            .single();

          if (fee) {
            const newPaidAmount = fee.paid_amount + parseFloat(amount);
            const newStatus = newPaidAmount >= fee.amount ? 'paid' : 'partial';

            await supabase
              .from('fees')
              .update({
                paid_amount: newPaidAmount,
                status: newStatus,
                updated_at: new Date()
              })
              .eq('id', feeId);
          }
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Payment processed successfully'
        });

      } catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/payments/statistics', authenticateToken, async (req, res) => {
      try {
        const { startDate, endDate, householdId } = req.query;
        const tenantId = req.user.tenantId;

        // Get payment statistics
        let paymentsQuery = supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed');

        if (startDate) {
          paymentsQuery = paymentsQuery.gte('created_at', startDate);
        }
        if (endDate) {
          paymentsQuery = paymentsQuery.lte('created_at', endDate);
        }
        if (householdId) {
          paymentsQuery = paymentsQuery.eq('household_id', householdId);
        }

        const { data: payments, error: paymentsError } = await paymentsQuery;

        if (paymentsError) {
          console.error('Payment statistics error:', paymentsError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch payment statistics'
          });
        }

        // Get fee statistics
        let feesQuery = supabase
          .from('fees')
          .select('*')
          .eq('tenant_id', tenantId);

        if (householdId) {
          feesQuery = feesQuery.eq('household_id', householdId);
        }

        const { data: fees, error: feesError } = await feesQuery;

        if (feesError) {
          console.error('Fee statistics error:', feesError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch fee statistics'
          });
        }

        // Calculate statistics
        const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const totalFees = fees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
        const totalPaid = fees?.reduce((sum, fee) => sum + fee.paid_amount, 0) || 0;
        const outstandingBalance = totalFees - totalPaid;

        const paymentMethods = payments?.reduce((acc, payment) => {
          acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
          return acc;
        }, {}) || {};

        const feeTypes = fees?.reduce((acc, fee) => {
          acc[fee.type] = (acc[fee.type] || 0) + fee.amount;
          return acc;
        }, {}) || {};

        const feeStatuses = fees?.reduce((acc, fee) => {
          acc[fee.status] = (acc[fee.status] || 0) + 1;
          return acc;
        }, {}) || {};

        res.json({
          success: true,
          data: {
            totalRevenue,
            totalFees,
            totalPaid,
            outstandingBalance,
            paymentMethods,
            feeTypes,
            feeStatuses,
            totalTransactions: payments?.length || 0,
            totalFeesCount: fees?.length || 0
          }
        });

      } catch (error) {
        console.error('Payment statistics error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Deliveries Routes
    app.get('/api/deliveries', authenticateToken, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, status, householdId } = req.query;
        const tenantId = req.user.tenantId;

        let query = supabase
          .from('deliveries')
          .select(`
            *,
            households:household_id(name, unit_number),
            users:recipient_id(first_name, last_name, email)
          `, { count: 'exact' })
          .eq('tenant_id', tenantId);

        if (search) {
          query = query.or(`tracking_number.ilike.%${search}%,courier_name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        if (status) {
          query = query.eq('status', status);
        }

        if (householdId) {
          query = query.eq('household_id', householdId);
        }

        const { data, error, count } = await query
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Deliveries error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch deliveries'
          });
        }

        res.json({
          success: true,
          data: data || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0
          }
        });

      } catch (error) {
        console.error('Deliveries error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/deliveries', authenticateToken, async (req, res) => {
      try {
        const {
          householdId,
          recipientId,
          trackingNumber,
          courierName,
          description,
          deliveryType,
          expectedDeliveryDate,
          notes
        } = req.body;

        const tenantId = req.user.tenantId;
        const receivedBy = req.user.id;

        // Validate required fields
        if (!householdId || !trackingNumber || !courierName || !deliveryType) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields'
          });
        }

        // Create delivery
        const { data, error } = await supabase
          .from('deliveries')
          .insert([{
            tenant_id: tenantId,
            household_id: householdId,
            recipient_id: recipientId || null,
            tracking_number: trackingNumber,
            courier_name: courierName,
            description,
            delivery_type: deliveryType,
            expected_delivery_date: expectedDeliveryDate || null,
            status: 'pending',
            notes,
            received_by: receivedBy,
            created_at: new Date(),
            updated_at: new Date()
          }])
          .select()
          .single();

        if (error) {
          console.error('Create delivery error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create delivery'
          });
        }

        res.status(201).json({
          success: true,
          data: data,
          message: 'Delivery logged successfully'
        });

      } catch (error) {
        console.error('Create delivery error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/deliveries/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const {
          recipientId,
          trackingNumber,
          courierName,
          description,
          deliveryType,
          expectedDeliveryDate,
          status,
          notes
        } = req.body;

        const tenantId = req.user.tenantId;

        // Verify delivery belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        const updateData = {
          updated_at: new Date()
        };

        if (recipientId !== undefined) updateData.recipient_id = recipientId;
        if (trackingNumber) updateData.tracking_number = trackingNumber;
        if (courierName) updateData.courier_name = courierName;
        if (description !== undefined) updateData.description = description;
        if (deliveryType) updateData.delivery_type = deliveryType;
        if (expectedDeliveryDate !== undefined) updateData.expected_delivery_date = expectedDeliveryDate;
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        // Set actual delivery date when marked as delivered
        if (status === 'delivered' && existing.status !== 'delivered') {
          updateData.actual_delivery_date = new Date();
          updateData.delivered_by = req.user.id;
        }

        const { data, error } = await supabase
          .from('deliveries')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Update delivery error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update delivery'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Delivery updated successfully'
        });

      } catch (error) {
        console.error('Update delivery error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/deliveries/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Verify delivery belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        // Delete delivery
        const { error } = await supabase
          .from('deliveries')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Delete delivery error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete delivery'
          });
        }

        res.json({
          success: true,
          message: 'Delivery deleted successfully'
        });

      } catch (error) {
        console.error('Delete delivery error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/deliveries/:id/check-in', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { location, notes } = req.body;
        const tenantId = req.user.tenantId;

        // Verify delivery belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        // Update delivery status to arrived
        const { data, error } = await supabase
          .from('deliveries')
          .update({
            status: 'arrived',
            actual_delivery_date: new Date(),
            delivery_location: location,
            delivery_notes: notes,
            delivered_by: req.user.id,
            updated_at: new Date()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Delivery check-in error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to check in delivery'
          });
        }

        res.json({
          success: true,
          data: data,
          message: 'Delivery checked in successfully'
        });

      } catch (error) {
        console.error('Delivery check-in error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/deliveries/:id/notify', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { message, channels } = req.body;
        const tenantId = req.user.tenantId;

        // Verify delivery belongs to tenant
        const { data: existing, error: checkError } = await supabase
          .from('deliveries')
          .select(`
            *,
            households:household_id(name, unit_number),
            users:recipient_id(first_name, last_name, email, phone)
          `)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (checkError || !existing) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        // Create notification
        const notificationData = {
          tenant_id: tenantId,
          household_id: existing.household_id,
          recipient_id: existing.recipient_id,
          type: 'delivery',
          title: 'Delivery Update',
          message: message || `Your delivery (${existing.tracking_number}) has arrived and is ready for pickup.`,
          channels: channels || ['app'],
          related_entity_type: 'delivery',
          related_entity_id: id,
          status: 'sent',
          created_at: new Date()
        };

        const { data, error } = await supabase
          .from('notifications')
          .insert([notificationData])
          .select()
          .single();

        if (error) {
          console.error('Create notification error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create notification'
          });
        }

        res.json({
          success: true,
          data: { notification: data, delivery: existing },
          message: 'Notification sent successfully'
        });

      } catch (error) {
        console.error('Notify delivery error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/deliveries/statistics', authenticateToken, async (req, res) => {
      try {
        const { startDate, endDate, householdId } = req.query;
        const tenantId = req.user.tenantId;

        // Get delivery statistics
        let deliveriesQuery = supabase
          .from('deliveries')
          .select('*')
          .eq('tenant_id', tenantId);

        if (startDate) {
          deliveriesQuery = deliveriesQuery.gte('created_at', startDate);
        }
        if (endDate) {
          deliveriesQuery = deliveriesQuery.lte('created_at', endDate);
        }
        if (householdId) {
          deliveriesQuery = deliveriesQuery.eq('household_id', householdId);
        }

        const { data: deliveries, error: deliveriesError } = await deliveriesQuery;

        if (deliveriesError) {
          console.error('Delivery statistics error:', deliveriesError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch delivery statistics'
          });
        }

        // Calculate statistics
        const totalDeliveries = deliveries?.length || 0;
        const pendingDeliveries = deliveries?.filter(d => d.status === 'pending').length || 0;
        const arrivedDeliveries = deliveries?.filter(d => d.status === 'arrived').length || 0;
        const deliveredDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;

        const courierStats = deliveries?.reduce((acc, delivery) => {
          acc[delivery.courier_name] = (acc[delivery.courier_name] || 0) + 1;
          return acc;
        }, {}) || {};

        const deliveryTypeStats = deliveries?.reduce((acc, delivery) => {
          acc[delivery.delivery_type] = (acc[delivery.delivery_type] || 0) + 1;
          return acc;
        }, {}) || {};

        res.json({
          success: true,
          data: {
            totalDeliveries,
            pendingDeliveries,
            arrivedDeliveries,
            deliveredDeliveries,
            courierStats,
            deliveryTypeStats
          }
        });

      } catch (error) {
        console.error('Delivery statistics error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Security Incidents API
    app.get('/api/security-incidents', authenticateToken, async (req, res) => {
      try {
        const {
          page = 1,
          limit = 50,
          status,
          severity,
          type,
          startDate,
          endDate,
          householdId,
          search
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let incidentsQuery = supabase
          .from('security_incidents')
          .select(`
            *,
            household:household_id (
              id,
              unit_number,
              address
            ),
            reported_by_user:reported_by (
              id,
              firstName,
              lastName,
              email
            ),
            assigned_to_user:assigned_to (
              id,
              firstName,
              lastName,
              email
            )
          `)
          .eq('tenant_id', req.user.tenantId)
          .order('created_at', { ascending: false });

        // Apply filters
        if (status) {
          incidentsQuery = incidentsQuery.eq('status', status);
        }
        if (severity) {
          incidentsQuery = incidentsQuery.eq('severity_level', severity);
        }
        if (type) {
          incidentsQuery = incidentsQuery.eq('incident_type', type);
        }
        if (householdId) {
          incidentsQuery = incidentsQuery.eq('household_id', householdId);
        }
        if (startDate) {
          incidentsQuery = incidentsQuery.gte('created_at', startDate);
        }
        if (endDate) {
          incidentsQuery = incidentsQuery.lte('created_at', endDate);
        }
        if (search) {
          incidentsQuery = incidentsQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`);
        }

        // Get total count
        const { count, error: countError } = await supabase
          .from('security_incidents')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', req.user.tenantId);

        if (countError) {
          console.error('Security incidents count error:', countError);
        }

        // Get paginated results
        const { data: incidents, error } = await incidentsQuery
          .range(offset, offset + parseInt(limit) - 1);

        if (error) {
          console.error('Security incidents fetch error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch security incidents'
          });
        }

        res.json({
          success: true,
          data: incidents || [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / parseInt(limit))
          }
        });

      } catch (error) {
        console.error('Security incidents error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/security-incidents', authenticateToken, async (req, res) => {
      try {
        const {
          title,
          description,
          incident_type,
          severity_level,
          location,
          household_id,
          occurred_at,
          suspected_individuals,
          witnesses,
          evidence,
          immediate_action_taken,
          reported_by
        } = req.body;

        // Validation
        if (!title || !description || !incident_type || !severity_level || !location) {
          return res.status(400).json({
            success: false,
            message: 'Title, description, incident type, severity level, and location are required'
          });
        }

        const incidentData = {
          tenant_id: req.user.tenantId,
          title,
          description,
          incident_type,
          severity_level,
          location,
          household_id: household_id || null,
          occurred_at: occurred_at || new Date().toISOString(),
          suspected_individuals: suspected_individuals || [],
          witnesses: witnesses || [],
          evidence: evidence || [],
          immediate_action_taken: immediate_action_taken || '',
          status: 'open',
          reported_by: reported_by || req.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: incident, error } = await supabase
          .from('security_incidents')
          .insert([incidentData])
          .select()
          .single();

        if (error) {
          console.error('Security incident creation error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create security incident'
          });
        }

        // Send real-time WebSocket notifications
        if (global.socketServer) {
          await global.socketServer.sendSecurityIncidentAlert(req.user.tenantId, {
            ...incident,
            reported_by_user: {
              id: req.user.id,
              firstName: req.user.firstName,
              lastName: req.user.lastName,
              email: req.user.email
            }
          });
        }

        // Create database notification for high severity incidents
        if (severity_level === 'critical' || severity_level === 'high') {
          await supabase
            .from('notifications')
            .insert([{
              tenant_id: req.user.tenantId,
              user_id: req.user.id,
              type: 'security_incident',
              title: `Security Incident: ${title}`,
              message: `A ${severity_level} severity security incident has been reported at ${location}`,
              data: { incident_id: incident.id },
              is_read: false,
              created_at: new Date().toISOString()
            }]);
        }

        res.status(201).json({
          success: true,
          data: incident,
          message: 'Security incident created successfully'
        });

      } catch (error) {
        console.error('Security incident creation error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/security-incidents/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;

        const { data: incident, error } = await supabase
          .from('security_incidents')
          .select(`
            *,
            household:household_id (
              id,
              unit_number,
              address
            ),
            reported_by_user:reported_by (
              id,
              firstName,
              lastName,
              email
            ),
            assigned_to_user:assigned_to (
              id,
              firstName,
              lastName,
              email
            )
          `)
          .eq('id', id)
          .eq('tenant_id', req.user.tenantId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({
              success: false,
              message: 'Security incident not found'
            });
          }
          console.error('Security incident fetch error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch security incident'
          });
        }

        res.json({
          success: true,
          data: incident
        });

      } catch (error) {
        console.error('Security incident fetch error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.put('/api/security-incidents/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove fields that shouldn't be updated directly
        delete updateData.id;
        delete updateData.tenant_id;
        delete updateData.created_at;
        updateData.updated_at = new Date().toISOString();

        const { data: incident, error } = await supabase
          .from('security_incidents')
          .update(updateData)
          .eq('id', id)
          .eq('tenant_id', req.user.tenantId)
          .select()
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return res.status(404).json({
              success: false,
              message: 'Security incident not found'
            });
          }
          console.error('Security incident update error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update security incident'
          });
        }

        res.json({
          success: true,
          data: incident,
          message: 'Security incident updated successfully'
        });

      } catch (error) {
        console.error('Security incident update error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.delete('/api/security-incidents/:id', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;

        // Check if incident exists and belongs to tenant
        const { data: incident, error: fetchError } = await supabase
          .from('security_incidents')
          .select('id, status')
          .eq('id', id)
          .eq('tenant_id', req.user.tenantId)
          .single();

        if (fetchError || !incident) {
          return res.status(404).json({
            success: false,
            message: 'Security incident not found'
          });
        }

        // Only allow deletion of resolved incidents
        if (incident.status !== 'resolved') {
          return res.status(400).json({
            success: false,
            message: 'Only resolved incidents can be deleted'
          });
        }

        const { error } = await supabase
          .from('security_incidents')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Security incident deletion error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete security incident'
          });
        }

        res.json({
          success: true,
          message: 'Security incident deleted successfully'
        });

      } catch (error) {
        console.error('Security incident deletion error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/security-incidents/:id/assign', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { assigned_to, notes } = req.body;

        if (!assigned_to) {
          return res.status(400).json({
            success: false,
            message: 'Assigned user ID is required'
          });
        }

        const { data: incident, error } = await supabase
          .from('security_incidents')
          .update({
            assigned_to,
            status: 'in_progress',
            notes: notes || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('tenant_id', req.user.tenantId)
          .select()
          .single();

        if (error) {
          console.error('Security incident assignment error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to assign security incident'
          });
        }

        // Create notification for assigned user
        if (assigned_to !== req.user.id) {
          await supabase
            .from('notifications')
            .insert([{
              tenant_id: req.user.tenantId,
              user_id: assigned_to,
              type: 'incident_assigned',
              title: 'Security Incident Assigned',
              message: `You have been assigned to investigate: ${incident.title}`,
              data: { incident_id: incident.id },
              is_read: false,
              created_at: new Date().toISOString()
            }]);
        }

        res.json({
          success: true,
          data: incident,
          message: 'Security incident assigned successfully'
        });

      } catch (error) {
        console.error('Security incident assignment error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.post('/api/security-incidents/:id/resolve', authenticateToken, async (req, res) => {
      try {
        const { id } = req.params;
        const { resolution_notes, final_action_taken, follow_up_required } = req.body;

        const { data: incident, error } = await supabase
          .from('security_incidents')
          .update({
            status: 'resolved',
            resolution_notes: resolution_notes || '',
            final_action_taken: final_action_taken || '',
            follow_up_required: follow_up_required || false,
            resolved_at: new Date().toISOString(),
            resolved_by: req.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('tenant_id', req.user.tenantId)
          .select()
          .single();

        if (error) {
          console.error('Security incident resolution error:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to resolve security incident'
          });
        }

        // Create notification for reporter
        if (incident.reported_by !== req.user.id) {
          await supabase
            .from('notifications')
            .insert([{
              tenant_id: req.user.tenantId,
              user_id: incident.reported_by,
              type: 'incident_resolved',
              title: 'Security Incident Resolved',
              message: `The security incident "${incident.title}" has been resolved`,
              data: { incident_id: incident.id },
              is_read: false,
              created_at: new Date().toISOString()
            }]);
        }

        res.json({
          success: true,
          data: incident,
          message: 'Security incident resolved successfully'
        });

      } catch (error) {
        console.error('Security incident resolution error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    app.get('/api/security-incidents/statistics', authenticateToken, async (req, res) => {
      try {
        const { startDate, endDate, householdId } = req.query;

        let incidentsQuery = supabase
          .from('security_incidents')
          .select('*')
          .eq('tenant_id', req.user.tenantId);

        // Apply date filters
        if (startDate) {
          incidentsQuery = incidentsQuery.gte('created_at', startDate);
        }
        if (endDate) {
          incidentsQuery = incidentsQuery.lte('created_at', endDate);
        }
        if (householdId) {
          incidentsQuery = incidentsQuery.eq('household_id', householdId);
        }

        const { data: incidents, error: incidentsError } = await incidentsQuery;

        if (incidentsError) {
          console.error('Security incidents statistics error:', incidentsError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch security incidents statistics'
          });
        }

        const totalIncidents = incidents?.length || 0;
        const openIncidents = incidents?.filter(i => i.status === 'open').length || 0;
        const inProgressIncidents = incidents?.filter(i => i.status === 'in_progress').length || 0;
        const resolvedIncidents = incidents?.filter(i => i.status === 'resolved').length || 0;

        const severityStats = incidents?.reduce((acc, incident) => {
          acc[incident.severity_level] = (acc[incident.severity_level] || 0) + 1;
          return acc;
        }, {}) || {};

        const typeStats = incidents?.reduce((acc, incident) => {
          acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
          return acc;
        }, {}) || {};

        const locationStats = incidents?.reduce((acc, incident) => {
          acc[incident.location] = (acc[incident.location] || 0) + 1;
          return acc;
        }, {}) || {};

        // Calculate average resolution time
        const resolvedIncidentsData = incidents?.filter(i => i.status === 'resolved' && i.resolved_at) || [];
        const averageResolutionTime = resolvedIncidentsData.length > 0
          ? resolvedIncidentsData.reduce((total, incident) => {
              const created = new Date(incident.created_at);
              const resolved = new Date(incident.resolved_at);
              return total + (resolved - created);
            }, 0) / resolvedIncidentsData.length / (1000 * 60 * 60) // in hours
          : 0;

        res.json({
          success: true,
          data: {
            totalIncidents,
            openIncidents,
            inProgressIncidents,
            resolvedIncidents,
            severityStats,
            typeStats,
            locationStats,
            averageResolutionTime: Math.round(averageResolutionTime * 10) / 10,
            resolutionRate: totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0
          }
        });

      } catch (error) {
        console.error('Security incidents statistics error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Initialize WebSocket server
    const socketServer = new SocketServer(server);

    // Make socket server available globally for API endpoints to use
    global.socketServer = socketServer;

    // Performance monitoring and cache statistics endpoint
    app.get('/api/performance/stats', authenticateToken, asyncHandler(async (req, res) => {
      try {
        const cacheStats = await cache.getStats();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        // Get active connections from WebSocket server
        const activeConnections = global.socketServer ? global.socketServer.getConnectedUsers().length : 0;

        const stats = {
          cache: cacheStats,
          performance: {
            memory: {
              rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
              heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
              heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
              external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100 // MB
              heapLimit: Math.round(memoryUsage.heapLimit / 1024 / 1024 * 100) / 100 // MB
            },
            cpu: {
              user: Math.round(cpuUsage.user / 1000 * 100) / 100, // percentage
              system: Math.round(cpuUsage.system / 1000 * 100) / 100, // percentage
              idle: Math.round(cpuUsage.idle / 1000 * 100) / 100 // percentage
              ir: Math.round(cpuUsage.ir / 1000 * 100) / 100, // percentage
            },
            uptime: {
              seconds: Math.round(process.uptime()),
              human: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
            },
            connections: activeConnections,
            timestamp: new Date().toISOString()
          }
        };

        res.json({
          success: true,
          data: stats
        });

      } catch (error) {
        console.error('Performance stats error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch performance statistics'
        });
      }
    }));

    // Cache health check endpoint
    app.get('/api/cache/health', authenticateToken, asyncHandler(async (req, res) => {
      try {
        const health = await cache.healthCheck();
        res.json({
          success: true,
          data: health
        });
      } catch (error) {
        console.error('Cache health check error:', error);
        res.status(500).json({
          success: false,
          message: 'Cache health check failed'
        });
      }
    }));

    // Cache management endpoint
    app.post('/api/cache/clear', authenticateToken, asyncHandler(async (req, res) => {
      try {
        const { pattern } = req.body;

        if (!pattern || typeof pattern !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Pattern is required'
          });
        }

        const success = await cache.clear(pattern);
        res.json({
          success,
          message: success ? `Cache cleared for pattern: ${pattern}` : 'Failed to clear cache'
        });
      } catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to clear cache'
        });
      }
    }));

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 HOA Community Platform API Server Started!`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`🔍 API Prefix: /api`);
      console.log(`📚 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
      console.log(`💾 Database: ${connected ? 'Supabase (PostgreSQL)' : 'In-memory (fallback)'}`);
      console.log(`✅ Server is ready to accept requests`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Fallback in-memory data
let users = [
  {
    id: '1',
    email: 'superadmin@demo.com',
    password: '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', // demo123
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // ... (rest of the in-memory users would be here)
];

let communities = [
  {
    id: '1',
    name: 'Sunny Meadows Community',
    address: '123 Sunshine Boulevard, Pleasantville',
    description: 'A beautiful residential community with modern amenities',
    adminContact: 'admin@sunnymeadows.com',
    totalUnits: 150,
    occupiedUnits: 142,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let announcements = [
  {
    id: '1',
    title: 'Welcome to Sunny Meadows Community',
    content: 'We are excited to have you as part of our community.',
    priority: 'high',
    published: true,
    authorId: '2',
    tenantId: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Start the server
startServer();