// Core type definitions for HOA Community Platform

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'inactive' | 'suspended';
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  mfa_enabled: boolean;
  mfa_secret?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Household {
  id: string;
  name: string;
  address: string;
  unit_number?: string;
  head_user_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Residence {
  id: string;
  household_id: string;
  address: string;
  unit_number?: string;
  type: string;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  is_owner_occupied: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Vehicle {
  id: string;
  household_id: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  license_plate: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GatePass {
  id: string;
  vehicle_id: string;
  pass_type: GatePassType;
  start_date: Date;
  end_date: Date;
  status: GatePassStatus;
  qr_code?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Guest {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  purpose?: string;
  expected_arrival?: Date;
  expected_departure?: Date;
  status: GuestStatus;
  approved_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConstructionPermit {
  id: string;
  household_id: string;
  contractor_name: string;
  work_type: string;
  start_date: Date;
  end_date: Date;
  description?: string;
  status: PermitStatus;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  target_audience: string;
  priority: AnnouncementPriority;
  is_published: boolean;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Election {
  id: string;
  title: string;
  description?: string;
  positions: ElectionPosition[];
  nomination_start_date: Date;
  nomination_end_date: Date;
  voting_start_date: Date;
  voting_end_date: Date;
  status: ElectionStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// Enums
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  ADMIN_HEAD = 'admin_head',
  ADMIN_OFFICER = 'admin_officer',
  SECURITY_HEAD = 'security_head',
  SECURITY_OFFICER = 'security_officer',
  HOUSEHOLD_HEAD = 'household_head',
  HOUSEHOLD_MEMBER = 'household_member',
  HOUSEHOLD_BENEFICIAL_USER = 'household_beneficial_user',
  RESIDENT = 'resident',
  BOARD_MEMBER = 'board_member'
}

export enum AnnouncementType {
  GENERAL = 'general',
  MAINTENANCE = 'maintenance',
  EVENT = 'event',
  SECURITY = 'security',
  POLICY = 'policy',
  EMERGENCY = 'emergency'
}

export enum AnnouncementAudience {
  ALL = 'all',
  RESIDENTS = 'residents',
  BOARD_MEMBERS = 'board_members',
  ADMIN_HEADS = 'admin_heads',
  SECURITY_PERSONNEL = 'security_personnel',
  SPECIFIC_HOUSEHOLDS = 'specific_households'
}

export type GatePassType = 'permanent' | 'temporary' | 'visitor' | 'delivery' | 'contractor';

export type GatePassStatus = 'active' | 'expired' | 'revoked' | 'pending';

export type GuestStatus = 'pending' | 'approved' | 'rejected' | 'checked_in' | 'checked_out';

export type PermitStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ElectionStatus = 'upcoming' | 'nomination' | 'voting' | 'completed' | 'cancelled';

export interface ElectionPosition {
  id: string;
  title: string;
  description?: string;
  max_candidates: number;
  candidates: ElectionCandidate[];
}

export interface ElectionCandidate {
  id: string;
  user_id: string;
  statement?: string;
  nominations: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  total?: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// JWT Payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  tenant_id?: string;
  household_id?: string;
  display_name?: string;
  iat?: number;
  exp?: number;
}

// Database connection options
export interface DatabaseOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  logging?: boolean;
}

// Redis connection options
export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

// Configuration types
export interface AppConfig {
  app: {
    name: string;
    version: string;
    env: string;
    port: number;
  };
  database: DatabaseOptions;
  redis: RedisOptions;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    destination: string;
  };
}