// Jest setup file for HOA Community Platform

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_hoa_platform';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('warning') || args[0].includes('deprecated'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('warning') || args[0].includes('deprecated'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  createMockTenant: () => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Community',
    subdomain: 'test-community',
    status: 'active',
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }),

  createMockUser: (overrides = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    first_name: 'Test',
    last_name: 'User',
    phone: '+1234567890',
    role: 'resident',
    mfa_enabled: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createMockHousehold: (overrides = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Test Household',
    address: '123 Test St',
    unit_number: 'A1',
    head_user_id: '550e8400-e29b-41d4-a716-446655440001',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),
};