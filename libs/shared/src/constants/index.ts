// Constants for HOA Community Platform

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_ADMIN: 'tenant_admin',
  ADMIN_HEAD: 'admin_head',
  SECURITY_HEAD: 'security_head',
  HOUSEHOLD_HEAD: 'household_head',
  RESIDENT: 'resident',
  SECURITY_OFFICER: 'security_officer',
} as const;

export const GATE_PASS_TYPES = {
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
  VISITOR: 'visitor',
  DELIVERY: 'delivery',
  CONTRACTOR: 'contractor',
} as const;

export const GATE_PASS_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
  PENDING: 'pending',
} as const;

export const GUEST_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
} as const;

export const PERMIT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ANNOUNCEMENT_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const ELECTION_STATUSES = {
  UPCOMING: 'upcoming',
  NOMINATION: 'nomination',
  VOTING: 'voting',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TENANT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

// Security constants
export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_ALGORITHM: 'HS256',
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_TIME: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  MFA_ISSUER: 'HOA Platform',
} as const;

// Database constants
export const DATABASE = {
  DEFAULT_PORT: 5432,
  DEFAULT_SSL_MODE: false,
  CONNECTION_TIMEOUT: 30000,
  IDLE_TIMEOUT: 10000,
} as const;

// Redis constants
export const REDIS = {
  DEFAULT_PORT: 6379,
  DEFAULT_DB: 0,
  KEY_PREFIX: 'hoa:',
  SESSION_TTL: 24 * 60 * 60, // 24 hours
  CACHE_TTL: 60 * 60, // 1 hour
} as const;

// File upload constants
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
  DESTINATION: './uploads',
} as const;

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Rate limiting constants
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false,
} as const;

// Audit log constants
export const AUDIT = {
  ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    APPROVE: 'approve',
    REJECT: 'reject',
    EXPORT: 'export',
  } as const,
  RESOURCE_TYPES: {
    USER: 'user',
    HOUSEHOLD: 'household',
    RESIDENCE: 'residence',
    VEHICLE: 'vehicle',
    GATE_PASS: 'gate_pass',
    GUEST: 'guest',
    CONSTRUCTION_PERMIT: 'construction_permit',
    ANNOUNCEMENT: 'announcement',
    ELECTION: 'election',
  } as const,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  DUPLICATE_ENTRY: 'Resource already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account temporarily locked',
  MFA_REQUIRED: 'Multi-factor authentication required',
  INVALID_MFA: 'Invalid MFA code',
  TENANT_NOT_FOUND: 'Tenant not found',
  USER_NOT_FOUND: 'User not found',
  HOUSEHOLD_NOT_FOUND: 'Household not found',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  GATE_PASS_NOT_FOUND: 'Gate pass not found',
  GUEST_NOT_FOUND: 'Guest not found',
  PERMIT_NOT_FOUND: 'Permit not found',
  ANNOUNCEMENT_NOT_FOUND: 'Announcement not found',
  ELECTION_NOT_FOUND: 'Election not found',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  MFA_ENABLED: 'MFA enabled successfully',
  MFA_DISABLED: 'MFA disabled successfully',
  RESOURCE_CREATED: 'Resource created successfully',
  RESOURCE_UPDATED: 'Resource updated successfully',
  RESOURCE_DELETED: 'Resource deleted successfully',
  APPROVAL_SUCCESS: 'Approval successful',
  REJECTION_SUCCESS: 'Rejection successful',
  EMAIL_SENT: 'Email sent successfully',
} as const;

// Validation regex patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  LICENSE_PLATE: /^[A-Z0-9\s\-]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;