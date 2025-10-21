// Guards for authentication and authorization

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, TENANT_KEY, AUDIT_KEY } from '../decorators';
import { UserRole, JwtPayload } from '../types';
import { AuditService } from '../services';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isTenantRequired = this.reflector.getAllAndOverride<boolean>(TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isTenantRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    return !!user.tenant_id;
  }
}

@Injectable()
export class AuditGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const auditConfig = this.reflector.get<AuditConfig>(AUDIT_KEY, context.getHandler());

    if (!auditConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const { method, url, body, params } = request;

    // Create audit log entry
    await this.auditService.createLog({
      tenant_id: user.tenant_id,
      user_id: user.sub,
      action: auditConfig.action,
      resource_type: auditConfig.resourceType,
      resource_id: params.id,
      old_values: request.oldValues,
      new_values: body,
      ip_address: request.ip,
      user_agent: request.get('User-Agent'),
    });

    return true;
  }
}

interface AuditConfig {
  action: string;
  resourceType: string;
}