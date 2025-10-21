// Custom decorators for HOA Community Platform

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types';

export const ROLES_KEY = 'roles';
export const TENANT_KEY = 'tenant';
export const AUDIT_KEY = 'audit';

// Role-based access control decorator
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Tenant-required decorator
export const TenantRequired = () => SetMetadata(TENANT_KEY, true);

// Audit logging decorator
export const Audit = (action: string, resourceType: string) =>
  SetMetadata(AUDIT_KEY, { action, resourceType });

// Public endpoint decorator (no authentication required)
export const Public = () => SetMetadata('isPublic', true);