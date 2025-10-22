// Validation decorators and schemas for HOA Community Platform

import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsDateString, IsUUID, Min, Max, Length, Matches, IsArray } from 'class-validator';
import { UserRole, GatePassType, GatePassStatus, GuestStatus, PermitStatus, AnnouncementPriority, ElectionStatus } from '../types';
import { VALIDATION_PATTERNS } from '../constants';

// User validators
export class CreateUserDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @Length(8, 128)
  @Matches(VALIDATION_PATTERNS.PASSWORD, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  public password!: string;

  @IsString()
  @Length(1, 100)
  public first_name!: string;

  @IsString()
  @Length(1, 100)
  public last_name!: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  public phone?: string;

  @IsEnum(['super_admin', 'platform_admin', 'tenant_admin', 'admin_head', 'security_head', 'admin_staff', 'security_staff', 'resident'])
  public role!: UserRole;

  @IsOptional()
  @IsBoolean()
  public mfa_enabled?: boolean;

  @IsOptional()
  @IsString()
  public mfa_secret?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public last_name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  public phone?: string;

  @IsOptional()
  @IsEnum(['super_admin', 'platform_admin', 'tenant_admin', 'admin_head', 'security_head', 'admin_staff', 'security_staff', 'resident'])
  public role?: UserRole;

  @IsOptional()
  @IsBoolean()
  public mfa_enabled?: boolean;

  @IsOptional()
  @IsString()
  @Length(8, 128)
  @Matches(VALIDATION_PATTERNS.PASSWORD, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  public password?: string;
}

// Tenant validators
export class CreateTenantDto {
  @IsString()
  @Length(1, 200)
  public name!: string;

  @IsString()
  @Length(1, 500)
  public address!: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  public phone?: string;

  @IsOptional()
  @IsEmail()
  public contact_email?: string;

  @IsUUID()
  public head_user_id!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  public max_households?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000)
  public max_users?: number;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  public phone?: string;

  @IsOptional()
  @IsEmail()
  public contact_email?: string;

  @IsOptional()
  @IsUUID()
  public head_user_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  public max_households?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000)
  public max_users?: number;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;
}

// Household validators
export class CreateHouseholdDto {
  @IsUUID()
  public household_id!: string;

  @IsString()
  @Length(1, 500)
  public address!: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public unit_number?: string;

  @IsOptional()
  @IsEnum(['owned', 'rented'])
  public type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public square_footage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public bathrooms?: number;

  @IsOptional()
  @IsUUID()
  public head_user_id?: string;
}

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  public address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public unit_number?: string;

  @IsOptional()
  @IsEnum(['owned', 'rented'])
  public type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public square_footage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public bathrooms?: number;

  @IsOptional()
  @IsUUID()
  public head_user_id?: string;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;
}

// Vehicle validators
export class CreateVehicleDto {
  @IsUUID()
  public household_id!: string;

  @IsString()
  @Length(1, 100)
  public make!: string;

  @IsString()
  @Length(1, 100)
  public model!: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  public year!: number;

  @IsString()
  @Length(1, 50)
  public color!: string;

  @IsString()
  @Length(1, 20)
  public license_plate!: string;

  @IsString()
  @Length(1, 50)
  public state!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public vin?: string;

  @IsOptional()
  @IsDateString()
  public registration_expiry?: string;

  @IsOptional()
  @IsDateString()
  public insurance_expiry?: string;

  @IsOptional()
  @IsEnum(['car', 'truck', 'motorcycle', 'suv', 'van', 'other'])
  public vehicle_type?: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  public make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  public year?: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  public color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  public license_plate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  public state?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public vin?: string;

  @IsOptional()
  @IsDateString()
  public registration_expiry?: string;

  @IsOptional()
  @IsDateString()
  public insurance_expiry?: string;

  @IsOptional()
  @IsEnum(['car', 'truck', 'motorcycle', 'suv', 'van', 'other'])
  public vehicle_type?: string;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;
}

// Gate pass validators
export class CreateGatePassDto {
  @IsUUID()
  public vehicle_id!: string;

  @IsEnum(['permanent', 'temporary', 'visitor', 'delivery', 'contractor'])
  public pass_type!: GatePassType;

  @IsDateString()
  public start_date!: string;

  @IsDateString()
  public end_date!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public purpose?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public requested_by?: string;

  @IsOptional()
  @IsEnum(['permanent', 'temporary', 'visitor', 'delivery', 'contractor'])
  public pass_type_enum?: string;
}

export class UpdateGatePassDto {
  @IsOptional()
  @IsEnum(['permanent', 'temporary', 'visitor', 'delivery', 'contractor'])
  public pass_type?: GatePassType;

  @IsOptional()
  @IsDateString()
  public start_date?: string;

  @IsOptional()
  @IsDateString()
  public end_date?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public purpose?: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'active', 'expired', 'cancelled'])
  public status?: string;
}

// Guest validators
export class CreateGuestDto {
  @IsUUID()
  public household_id!: string;

  @IsString()
  @Length(1, 100)
  public first_name!: string;

  @IsString()
  @Length(1, 100)
  public last_name!: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  public phone?: string;

  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsDateString()
  public expected_arrival!: string;

  @IsDateString()
  public expected_departure!: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public purpose?: string;

  @IsOptional()
  @IsBoolean()
  public needs_gate_pass?: boolean;

  @IsOptional()
  @IsEnum(['registered', 'checked_in', 'checked_out', 'cancelled'])
  public status?: string;
}

export class UpdateGuestDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  public first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public last_name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  public phone?: string;

  @IsOptional()
  @IsEmail()
  public email?: string;

  @IsOptional()
  @IsDateString()
  public expected_arrival?: string;

  @IsOptional()
  @IsDateString()
  public expected_departure?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  public purpose?: string;

  @IsOptional()
  @IsBoolean()
  public needs_gate_pass?: string;

  @IsOptional()
  @IsEnum(['registered', 'checked_in', 'checked_out', 'cancelled'])
  public status?: string;
}

// Construction permit validators
export class CreateConstructionPermitDto {
  @IsUUID()
  public household_id!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public contractor_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public contractor_phone?: string;

  @IsOptional()
  @IsEmail()
  public contractor_email?: string;

  @IsString()
  @Length(1, 200)
  public work_type!: string;

  @IsDateString()
  public start_date!: string;

  @IsDateString()
  public end_date!: string;

  @IsString()
  @Length(1, 2000)
  public description!: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'])
  public status?: string;
}

export class UpdateConstructionPermitDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public contractor_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public contractor_phone?: string;

  @IsOptional()
  @IsEmail()
  public contractor_email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  public work_type?: string;

  @IsOptional()
  @IsDateString()
  public start_date?: string;

  @IsOptional()
  @IsDateString()
  public end_date?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  public description?: string;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'active', 'completed', 'cancelled'])
  public status?: string;
}

// Announcement validators
export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 200)
  public title!: string;

  @IsString()
  @Length(1, 5000)
  public content!: string;

  @IsEnum(['all', 'residents', 'admins', 'security', 'maintenance'])
  public target_audience!: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  public priority!: AnnouncementPriority;

  @IsOptional()
  @IsDateString()
  public publish_at?: string;

  @IsOptional()
  @IsDateString()
  public expire_at?: string;

  @IsOptional()
  @IsBoolean()
  public allow_comments?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public attachments?: string[];
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  public content?: string;

  @IsOptional()
  @IsEnum(['all', 'residents', 'admins', 'security', 'maintenance'])
  public target_audience?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  public priority?: AnnouncementPriority;

  @IsOptional()
  @IsDateString()
  public publish_at?: string;

  @IsOptional()
  @IsDateString()
  public expire_at?: string;

  @IsOptional()
  @IsBoolean()
  public allow_comments?: boolean;

  @IsOptional()
  @IsBoolean()
  public is_published?: boolean;
}

// Search DTOs
export class SearchDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  public query?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  public page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  public limit?: number = 10;

  @IsOptional()
  @IsString()
  public sort_by?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  public sort_order?: string = 'desc';
}

export class SearchUsersDto extends SearchDto {
  @IsOptional()
  @IsEnum(['super_admin', 'platform_admin', 'tenant_admin', 'admin_head', 'security_head', 'admin_staff', 'security_staff', 'resident'])
  public role?: string;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public household_id?: string;
}

export class SearchHouseholdsDto extends SearchDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public address?: string;

  @IsOptional()
  @IsEnum(['owned', 'rented'])
  public type?: string;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;
}

export class SearchVehiclesDto extends SearchDto {
  @IsOptional()
  @IsUUID()
  public household_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  public license_plate?: string;

  @IsOptional()
  @IsBoolean()
  public is_active?: boolean;
}

export class SearchGatePassesDto extends SearchDto {
  @IsOptional()
  @IsUUID()
  public vehicle_id?: string;

  @IsOptional()
  @IsEnum(['permanent', 'temporary', 'visitor', 'delivery', 'contractor'])
  public pass_type?: GatePassType;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'active', 'expired', 'cancelled'])
  public status?: GatePassStatus;

  @IsOptional()
  @IsDateString()
  public start_date_from?: string;

  @IsOptional()
  @IsDateString()
  public start_date_to?: string;
}

export class SearchGuestsDto extends SearchDto {
  @IsOptional()
  @IsUUID()
  public household_id?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public name?: string;

  @IsOptional()
  @IsEnum(['registered', 'checked_in', 'checked_out', 'cancelled'])
  public status?: GuestStatus;

  @IsOptional()
  @IsDateString()
  public expected_arrival_from?: string;

  @IsOptional()
  @IsDateString()
  public expected_arrival_to?: string;
}

export class SearchAnnouncementsDto extends SearchDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  public title?: string;

  @IsOptional()
  @IsEnum(['all', 'residents', 'admins', 'security', 'maintenance'])
  public target_audience?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  public priority?: AnnouncementPriority;

  @IsOptional()
  @IsBoolean()
  public is_published?: boolean;

  @IsOptional()
  @IsDateString()
  public publish_at_from?: string;

  @IsOptional()
  @IsDateString()
  public publish_at_to?: string;
}

// Auth DTOs
export class LoginDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @Length(6, 128)
  public password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6)
  public mfa_token?: string;
}

export class RegisterDto extends CreateUserDto {
  @IsUUID()
  public tenant_id!: string;

  @IsOptional()
  @IsUUID()
  public household_id?: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(8, 128)
  public current_password!: string;

  @IsString()
  @Length(8, 128)
  @Matches(VALIDATION_PATTERNS.PASSWORD, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  public new_password!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  public email!: string;
}

export class ConfirmResetPasswordDto {
  @IsString()
  @Length(32, 64)
  public token!: string;

  @IsString()
  @Length(8, 128)
  @Matches(VALIDATION_PATTERNS.PASSWORD, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  public new_password!: string;
}

export class EnableMfaDto {
  @IsString()
  @Length(6, 6)
  public token!: string;
}

export class VerifyMfaDto {
  @IsString()
  @Length(6, 6)
  public token!: string;
}

// Response DTOs
export class UserResponseDto {
  id!: string;
  email!: string;
  first_name!: string;
  last_name!: string;
  phone?: string;
  role!: UserRole;
  is_active!: boolean;
  mfa_enabled!: boolean;
  tenant_id!: string;
  household_id?: string;
  created_at!: string;
  updated_at!: string;
}

export class TenantResponseDto {
  id!: string;
  name!: string;
  address!: string;
  phone?: string;
  contact_email?: string;
  head_user_id!: string;
  is_active!: boolean;
  max_households!: number;
  max_users!: number;
  created_at!: string;
  updated_at!: string;
}

export class HouseholdResponseDto {
  id!: string;
  address!: string;
  unit_number?: string;
  type!: string;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  head_user_id?: string;
  is_active!: boolean;
  tenant_id!: string;
  created_at!: string;
  updated_at!: string;
}

export class VehicleResponseDto {
  id!: string;
  household_id!: string;
  make!: string;
  model!: string;
  year!: number;
  color!: string;
  license_plate!: string;
  state!: string;
  vin?: string;
  registration_expiry?: string;
  insurance_expiry?: string;
  vehicle_type!: string;
  is_active!: boolean;
  created_at!: string;
  updated_at!: string;
}

export class GatePassResponseDto {
  id!: string;
  vehicle_id!: string;
  pass_type!: GatePassType;
  start_date!: string;
  end_date!: string;
  purpose?: string;
  status!: GatePassStatus;
  qr_code?: string;
  created_at!: string;
  updated_at!: string;
}

export class GuestResponseDto {
  id!: string;
  household_id!: string;
  first_name!: string;
  last_name!: string;
  phone?: string;
  email?: string;
  expected_arrival!: string;
  expected_departure!: string;
  purpose?: string;
  status!: GuestStatus;
  gate_pass_id?: string;
  created_at!: string;
  updated_at!: string;
}

export class AnnouncementResponseDto {
  id!: string;
  title!: string;
  content!: string;
  target_audience!: string;
  priority!: AnnouncementPriority;
  is_published!: boolean;
  publish_at?: string;
  expire_at?: string;
  allow_comments!: boolean;
  author_id!: string;
  attachments?: string[];
  created_at!: string;
  updated_at!: string;
}

export class AuthResponseDto {
  access_token!: string;
  refresh_token!: string;
  user!: UserResponseDto;
  tenant?: TenantResponseDto;
  mfa_required!: boolean;
}

export class PaginatedResponseDto<T> {
  data!: T[];
  total!: number;
  page!: number;
  limit!: number;
  total_pages!: number;
}

export class SuccessResponseDto {
  public success!: boolean;
  public message!: string;
  public data?: any;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export class ErrorResponseDto {
  success: boolean;
  error: ErrorDetail;
}
