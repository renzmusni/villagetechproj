// Custom error classes for HOA Community Platform

import { HttpException, HttpStatus } from '@nestjs/common';

export class BaseError extends HttpException {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
        },
      },
      httpStatus,
    );
  }
}

// Validation errors
export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details, HttpStatus.BAD_REQUEST);
  }
}

// Authentication errors
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', undefined, HttpStatus.UNAUTHORIZED);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', undefined, HttpStatus.FORBIDDEN);
  }
}

export class MFARequiredError extends BaseError {
  constructor(message: string = 'Multi-factor authentication required') {
    super(message, 'MFA_REQUIRED', undefined, HttpStatus.UNAUTHORIZED);
  }
}

// Resource errors
export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', { resource, id }, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', details, HttpStatus.CONFLICT);
  }
}

// Business logic errors
export class BusinessRuleError extends BaseError {
  constructor(message: string, rule: string, details?: any) {
    super(message, 'BUSINESS_RULE_ERROR', { rule, ...details }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class TenantError extends BaseError {
  constructor(message: string, tenantId?: string) {
    super(message, 'TENANT_ERROR', { tenantId }, HttpStatus.BAD_REQUEST);
  }
}

// Rate limiting errors
export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', undefined, HttpStatus.TOO_MANY_REQUESTS);
  }
}

// External service errors
export class ExternalServiceError extends BaseError {
  constructor(service: string, message: string, details?: any) {
    super(
      `External service error: ${service} - ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      { service, ...details },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

// Database errors
export class DatabaseError extends BaseError {
  constructor(message: string, query?: string) {
    super(
      `Database error: ${message}`,
      'DATABASE_ERROR',
      { query },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}