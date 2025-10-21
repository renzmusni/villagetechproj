module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/libs'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'libs/**/*.ts',
    '!src/**/*.d.ts',
    '!libs/**/*.d.ts',
    '!src/**/node_modules/**',
    '!libs/**/node_modules/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!libs/**/*.test.ts',
    '!libs/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/libs/shared/src/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/src/$1',
    '^@admin/(.*)$': '<rootDir>/src/admin/src/$1',
    '^@residence/(.*)$': '<rootDir>/src/residence/src/$1',
    '^@sentinel/(.*)$': '<rootDir>/src/sentinel/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
};