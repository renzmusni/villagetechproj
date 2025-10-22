// Test setup and utilities

const jwt = require('jsonwebtoken');
const { supabase } = require('../database');

// Test database and environment setup
const setupTestDatabase = async () => {
  // Create test JWT token
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'admin',
    tenantId: 'test-tenant-id',
    firstName: 'Test',
    lastName: 'User'
  };

  const testToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret-key');

  return { testUser, testToken };
};

// Create test data
const createTestData = async () => {
  const testTenant = {
    id: 'test-tenant-id',
    name: 'Test Community',
    address: '123 Test Street, Test City',
    description: 'Test community for unit testing'
  };

  const testHousehold = {
    id: 'test-household-id',
    unit_number: 'A101',
    address: '101 Test Street',
    type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    area_sqft: 850,
    owner_name: 'Test Owner',
    owner_email: 'owner@test.com',
    owner_phone: '+1234567890'
  };

  const testVehicle = {
    id: 'test-vehicle-id',
    make: 'Toyota',
    model: 'Camry',
    year: 2023,
    color: 'Blue',
    license_plate: 'TEST123',
    type: 'car',
    household_id: 'test-household-id'
  };

  const testDelivery = {
    id: 'test-delivery-id',
    recipient_name: 'John Doe',
    courier_service: 'Test Courier',
    tracking_number: 'TRACK123',
    package_type: 'small_package',
    household_id: 'test-household-id',
    status: 'pending'
  };

  const testSecurityIncident = {
    id: 'test-incident-id',
    title: 'Test Security Incident',
    description: 'This is a test security incident',
    incident_type: 'suspicious_activity',
    severity_level: 'medium',
    location: 'Test Location',
    status: 'open',
    household_id: 'test-household-id'
  };

  return {
    tenant: testTenant,
    household: testHousehold,
    vehicle: testVehicle,
    delivery: testDelivery,
    securityIncident: testSecurityIncident
  };
};

// Clean up test data
const cleanupTestData = async () => {
  const tables = ['tenants', 'households', 'vehicles', 'deliveries', 'security_incidents'];

  for (const table of tables) {
    try {
      // Clean up any test data
      await supabase
        .from(table)
        .delete()
        .eq('id', 'test-%'); // Delete any test records
        .like('test-%'); // Cleanup pattern
    } catch (error) {
      console.warn(`Cleanup warning for ${table}:`, error);
    }
  }

  console.log('🧹 Test data cleaned up');
};

// Mock responses
const mockSuccessResponse = (data, message = 'Success') => ({
  success: true,
  data,
  message
});

const mockErrorResponse = (message, statusCode = 500, errorCode = null) => ({
  success: false,
  message,
  error: {
    code: errorCode,
    message,
    timestamp: new Date().toISOString()
  },
  statusCode
});

// HTTP request mocking
const mockRequest = (options = {}) => {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    json: true,
    timeout: 5000
  };

  const finalOptions = { ...defaultOptions, ...options };

  return {
    ...finalOptions,
    url: finalOptions.url || `http://localhost:4003${finalOptions.endpoint || ''}`,
    body: finalOptions.body || null
  };
};

// Authentication test helpers
const testAuthentication = (app) => {
  const testCases = [
    {
      name: 'Valid login',
      request: {
        email: 'test@example.com',
        password: 'testpassword'
      },
      expectedStatus: 200,
      expectedFields: ['token', 'user']
    },
    {
      name: 'Invalid email',
      request: {
        email: 'invalid@example.com',
        password: 'testpassword'
      },
      expectedStatus: 401,
      expectedFields: ['message']
    },
    {
      name: 'Invalid password',
      request: {
        email: 'test@example.com',
        password: 'wrongpassword'
      },
      expectedStatus: 401,
      expectedFields: ['message']
    },
    {
      name: 'Missing credentials',
      request: {
        email: '',
        password: ''
      },
      expectedStatus: 400,
      expectedFields: ['message']
    }
  ];

  return testCases;
};

// Validation helpers
const validateResponse = (response, expectedStatus, expectedFields = []) => {
  expect(response).toBeDefined();
  expect(response.status).toBe(expectedStatus);

  if (expectedFields.length > 0) {
    expect(response.data).toBeDefined();
    expect(response.data.success).toBe(true);

    for (const field of expectedFields) {
      expect(response.data.data).toHaveProperty(field);
    }
  }
};

const validateErrorResponse = (response, expectedStatus, expectedMessage) => {
  expect(response).toBeDefined();
  expect(response.status).toBe(expectedStatus);
  expect(response.data.success).toBe(false);
  expect(response.data.message).toContain(expectedMessage);
};

// Database test helpers
const validateDatabaseInsert = (result, tableName) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.data.id).toBeDefined();
  expect(result.data.id).toMatch(new RegExp(`^${tableName}-`));
};

const validateDatabaseUpdate = (result, tableName) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.data.updated_at).toBeDefined();
};

const validateDatabaseDelete = (result, tableName) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
};

// WebSocket test helpers
const mockWebSocketConnection = () => {
  const mockSocket = {
    connected: true,
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn()
  };

  return mockSocket;
};

module.exports = {
  setupTestDatabase,
  createTestData,
  cleanupTestData,
  mockSuccessResponse,
  mockErrorResponse,
  mockRequest,
  testAuthentication,
  validateResponse,
  validateErrorResponse,
  validateDatabaseInsert,
  validateDatabaseUpdate,
  validateDatabaseDelete,
  mockWebSocketConnection
};