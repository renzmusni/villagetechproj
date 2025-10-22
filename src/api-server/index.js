const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (for demo purposes)
let users = [
  {
    id: '1',
    email: 'superadmin@demo.com',
    password: '$2b$10$rQJkGY5pNqZsJQn8Qq7M6u9LjPqXQzQzQzQzQzQzQzQzQzQzQzQ', // demo123
    role: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let communities = [
  {
    id: '1',
    name: 'Sunny Meadows',
    address: '123 Sunshine Blvd, Sunnyvale, CA',
    type: 'Apartment Complex',
    totalUnits: 150,
    occupiedUnits: 142,
    adminContact: 'Maria Garcia',
    adminEmail: 'maria@sunnymeadows.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'Riverside Apartments',
    address: '456 River Road, Riverside, CA',
    type: 'Apartment Complex',
    totalUnits: 200,
    occupiedUnits: 185,
    adminContact: 'John Smith',
    adminEmail: 'john@riverside.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Oakwood Gardens',
    address: '789 Oak Avenue, Oakville, CA',
    type: 'Townhouse Community',
    totalUnits: 80,
    occupiedUnits: 78,
    adminContact: 'Sarah Johnson',
    adminEmail: 'sarah@oakwood.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Pine View Condos',
    address: '321 Pine Street, Pineville, CA',
    type: 'Condominium Complex',
    totalUnits: 120,
    occupiedUnits: 110,
    adminContact: 'Michael Brown',
    adminEmail: 'michael@pineview.com',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

let tenants = [
  {
    id: '1',
    communityId: '1',
    name: 'Maria Garcia Household',
    type: 'Residential',
    status: 'active',
    members: 4,
    headOfHousehold: 'Maria Garcia',
    contactEmail: 'maria.garcia@email.com',
    address: 'Unit 101-A, Sunny Meadows',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    communityId: '2',
    name: 'Robert Johnson Household',
    type: 'Residential',
    status: 'active',
    members: 2,
    headOfHousehold: 'Robert Johnson',
    contactEmail: 'robert.johnson@email.com',
    address: 'Unit 205-B, Riverside Apartments',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    communityId: '1',
    name: 'Emily Chen Household',
    type: 'Residential',
    status: 'active',
    members: 3,
    headOfHousehold: 'Emily Chen',
    contactEmail: 'emily.chen@email.com',
    address: 'Unit 302-C, Sunny Meadows',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    communityId: '3',
    name: 'David Martinez Household',
    type: 'Residential',
    status: 'active',
    members: 5,
    headOfHousehold: 'David Martinez',
    contactEmail: 'david.martinez@email.com',
    address: 'Unit 150-D, Oakwood Gardens',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Helper functions
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

// Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
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

// Communities
app.get('/api/communities', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/communities', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const { name, address, type, totalUnits, adminContact, adminEmail } = req.body;

    if (!name || !address || !type || !totalUnits || !adminContact || !adminEmail) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const newCommunity = {
      id: uuidv4(),
      name,
      address,
      type,
      totalUnits: parseInt(totalUnits),
      occupiedUnits: 0,
      adminContact,
      adminEmail,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    communities.push(newCommunity);

    res.status(201).json({
      success: true,
      data: newCommunity,
      message: 'Community created successfully'
    });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Tenants
app.get('/api/tenants', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const enrichedTenants = tenants.map(tenant => {
      const community = communities.find(c => c.id === tenant.communityId);
      return {
        ...tenant,
        community: community ? {
          id: community.id,
          name: community.name,
          address: community.address
        } : null,
        occupancyRate: community ? ((community.occupiedUnits / community.totalUnits) * 100).toFixed(1) : '0'
      };
    });

    res.json({
      success: true,
      data: enrichedTenants
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/tenants', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const { communityId, name, type, members, headOfHousehold, contactEmail, address } = req.body;

    if (!communityId || !name || !type || !members || !headOfHousehold || !contactEmail || !address) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const community = communities.find(c => c.id === communityId);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    const newTenant = {
      id: uuidv4(),
      communityId,
      name,
      type,
      status: 'active',
      members: parseInt(members),
      headOfHousehold,
      contactEmail,
      address,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tenants.push(newTenant);

    // Update community occupied units
    community.occupiedUnits += 1;

    res.status(201).json({
      success: true,
      data: newTenant,
      message: 'Tenant added successfully'
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Users
app.get('/api/users', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const usersWithRoles = [
      {
        id: '2',
        name: 'Maria Garcia',
        email: 'maria.garcia@email.com',
        role: 'admin-head',
        status: 'active',
        tenant: 'Sunny Meadows',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '3',
        name: 'John Smith',
        email: 'john.smith@email.com',
        role: 'admin-officer',
        status: 'active',
        tenant: 'Riverside Apartments',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '4',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@email.com',
        role: 'security-head',
        status: 'active',
        tenant: 'Oakwood Gardens',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '5',
        name: 'Michael Brown',
        email: 'michael.brown@email.com',
        role: 'household-head',
        status: 'active',
        tenant: 'Pine View Condos',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '6',
        name: 'Emily Chen',
        email: 'emily.chen@email.com',
        role: 'household-member',
        status: 'active',
        tenant: 'Sunny Meadows',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '7',
        name: 'David Martinez',
        email: 'david.martinez@email.com',
        role: 'household-beneficial-user',
        status: 'active',
        tenant: 'Oakwood Gardens',
        createdAt: new Date(),
        lastLogin: new Date()
      },
      {
        id: '8',
        name: 'Robert Wilson',
        email: 'robert.wilson@email.com',
        role: 'security-officer',
        status: 'active',
        tenant: 'Riverside Apartments',
        createdAt: new Date(),
        lastLogin: new Date()
      }
    ];

    res.json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/users', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const { name, email, role, tenant, password } = req.body;

    if (!name || !email || !role || !tenant || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      role,
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        name: `${newUser.firstName} ${newUser.lastName}`,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        tenant,
        createdAt: newUser.createdAt
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, requireRole('superadmin'), (req, res) => {
  try {
    const stats = {
      totalCommunities: communities.length,
      activeTenants: tenants.length,
      totalUsers: users.length + 7, // Add some demo users
      totalHouseholds: tenants.length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'HOA API Server is running',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 HOA Community Platform API Server Started!
📍 Environment: ${process.env.NODE_ENV || 'development'}
🌐 Server URL: http://localhost:${PORT}
🔍 API Prefix: /api
📚 Health Check: http://localhost:${PORT}/api/health
  `);
});