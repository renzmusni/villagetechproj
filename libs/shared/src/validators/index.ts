// Validation decorators and schemas for HOA Community Platform

import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsDateString, IsUUID, Min, Max, Length, Matches, IsArray } from 'class-validator';
import { UserRole, GatePassType, GatePassStatus, GuestStatus, PermitStatus, AnnouncementPriority, ElectionStatus } from '../types';
import { VALIDATION_PATTERNS } from '../constants';

// User validators
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 128)
  @Matches(VALIDATION_PATTERNS.PASSWORD, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })
  password: string;

  @IsString()
  @Length(1, 100)
  first_name: string;

  @IsString()
  @Length(1, 100)
  last_name: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  mfa_enabled?: boolean;

  @IsOptional()
  @IsString()
  mfa_secret?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// Household validators
export class CreateHouseholdDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 500)
  address: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit_number?: string;

  @IsUUID()
  head_user_id: string;
}

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit_number?: string;

  @IsOptional()
  @IsUUID()
  head_user_id?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// Residence validators
export class CreateResidenceDto {
  @IsUUID()
  household_id: string;

  @IsString()
  @Length(1, 500)
  address: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit_number?: string;

  @IsString()
  @Length(1, 100)
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  square_footage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @IsBoolean()
  is_owner_occupied?: boolean;
}

export class UpdateResidenceDto {
  @IsOptional()
  @IsString()
  @Length(1, 500)
  address?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  unit_number?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  square_footage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @IsBoolean()
  is_owner_occupied?: boolean;
}

// Vehicle validators
export class CreateVehicleDto {
  @IsUUID()
  household_id: string;

  @IsString()
  @Length(1, 100)
  make: string;

  @IsString()
  @Length(1, 100)
  model: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @IsString()
  @Length(1, 20)
  @Matches(VALIDATION_PATTERNS.LICENSE_PLATE, { message: 'Invalid license plate format' })
  license_plate: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Matches(VALIDATION_PATTERNS.LICENSE_PLATE, { message: 'Invalid license plate format' })
  license_plate?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

// Gate Pass validators
export class CreateGatePassDto {
  @IsUUID()
  vehicle_id: string;

  @IsEnum(GatePassType)
  pass_type: GatePassType;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;
}

export class UpdateGatePassDto {
  @IsOptional()
  @IsEnum(GatePassType)
  pass_type?: GatePassType;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsEnum(GatePassStatus)
  status?: GatePassStatus;
}

// Guest validators
export class CreateGuestDto {
  @IsUUID()
  household_id: string;

  @IsString()
  @Length(1, 100)
  first_name: string;

  @IsString()
  @Length(1, 100)
  last_name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  purpose?: string;

  @IsOptional()
  @IsDateString()
  expected_arrival?: string;

  @IsOptional()
  @IsDateString()
  expected_departure?: string;
}

export class UpdateGuestDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  last_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(10, 20)
  @Matches(VALIDATION_PATTERNS.PHONE, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  purpose?: string;

  @IsOptional()
  @IsDateString()
  expected_arrival?: string;

  @IsOptional()
  @IsDateString()
  expected_departure?: string;

  @IsOptional()
  @IsEnum(GuestStatus)
  status?: GuestStatus;
}

// Construction Permit validators
export class CreateConstructionPermitDto {
  @IsUUID()
  household_id: string;

  @IsString()
  @Length(1, 255)
  contractor_name: string;

  @IsString()
  @Length(1, 100)
  work_type: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;
}

export class UpdateConstructionPermitDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  contractor_name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  work_type?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  description?: string;

  @IsOptional()
  @IsEnum(PermitStatus)
  status?: PermitStatus;
}

// Announcement validators
export class CreateAnnouncementDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  @Length(1, 2000)
  content: string;

  @IsString()
  @Length(1, 100)
  target_audience: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  content?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  target_audience?: string;

  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

// Pagination validators
export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// Query validators
export class SearchQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string = 'created_at';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' = 'desc';
}