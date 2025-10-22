const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import Supabase database
const { supabase, testConnection, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());

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

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 HOA Community Platform API Server Started!`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`🔍 API Prefix: /api`);
      console.log(`📚 Health Check: http://localhost:${PORT}/api/health`);
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