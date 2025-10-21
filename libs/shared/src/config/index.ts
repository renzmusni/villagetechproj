// Configuration management for HOA Community Platform

import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, IsEnum, IsUrl, validateSync } from 'class-validator';
import { UserRole } from '../types';

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class DatabaseConfig {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  database: string;

  @IsOptional()
  @IsBoolean()
  ssl?: boolean = false;

  @IsOptional()
  @IsBoolean()
  logging?: boolean = false;

  @IsOptional()
  @IsNumber()
  connectionTimeout?: number = 30000;

  @IsOptional()
  @IsNumber()
  idleTimeout?: number = 10000;
}

export class RedisConfig {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsNumber()
  db?: number = 0;

  @IsOptional()
  @IsNumber()
  retryDelayOnFailover?: number = 100;

  @IsOptional()
  @IsNumber()
  maxRetriesPerRequest?: number = 3;

  @IsOptional()
  @IsString()
  keyPrefix?: string = 'hoa:';
}

export class JWTConfig {
  @IsString()
  secret: string;

  @IsString()
  expiresIn: string;

  @IsOptional()
  @IsString()
  issuer?: string = 'HOA Platform';

  @IsOptional()
  @IsString()
  audience?: string = 'HOA Platform Users';
}

export class CORSConfig {
  @IsArray()
  @IsString({ each: true })
  origin: string[];

  @IsOptional()
  @IsBoolean()
  credentials?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedHeaders?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  methods?: string[];
}

export class UploadConfig {
  @IsNumber()
  maxFileSize: number;

  @IsArray()
  @IsString({ each: true })
  allowedTypes: string[];

  @IsString()
  destination: string;

  @IsOptional()
  @IsUrl()
  baseUrl?: string;
}

export class AppConfig {
  @IsString()
  name: string;

  @IsString()
  version: string;

  @IsEnum(Environment)
  env: Environment;

  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsUrl()
  frontendUrl?: string;

  @IsOptional()
  @IsBoolean()
  debug?: boolean = false;
}

export class SecurityConfig {
  @IsNumber()
  bcryptRounds: number;

  @IsNumber()
  maxLoginAttempts: number;

  @IsNumber()
  accountLockTime: number;

  @IsNumber()
  passwordMinLength: number;

  @IsNumber()
  passwordMaxLength: number;

  @IsString()
  mfaIssuer: string;

  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  mfaRequiredRoles?: UserRole[];
}

export class EmailConfig {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  user: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean = false;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  fromName?: string;
}

export class PaymentConfig {
  @IsString()
  stripeSecretKey: string;

  @IsOptional()
  @IsString()
  stripeWebhookSecret?: string;

  @IsString()
  paypalClientId: string;

  @IsString()
  paypalClientSecret: string;

  @IsOptional()
  @IsBoolean()
  sandbox?: boolean = true;
}

export class EnvironmentVariables {
  @IsString()
  NODE_ENV: Environment;

  @IsString()
  APP_NAME: string;

  @IsString()
  APP_VERSION: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  APP_PORT: number;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USERNAME: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsArray()
  @Transform(({ value }) => value.split(','))
  CORS_ORIGIN: string[];

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  BCRYPT_ROUNDS: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  MAX_LOGIN_ATTEMPTS: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  ACCOUNT_LOCK_TIME: number;

  @IsString()
  SMTP_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  SMTP_PORT: number;

  @IsString()
  SMTP_USER: string;

  @IsString()
  SMTP_PASS: string;

  @IsString()
  STRIPE_SECRET_KEY: string;

  @IsString()
  PAYPAL_CLIENT_ID: string;

  @IsString()
  PAYPAL_CLIENT_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

export function createConfig(env: Record<string, unknown>): {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  cors: CORSConfig;
  upload: UploadConfig;
  security: SecurityConfig;
  email: EmailConfig;
  payment: PaymentConfig;
} {
  const validated = validate(env);

  return {
    app: {
      name: validated.APP_NAME,
      version: validated.APP_VERSION,
      env: validated.NODE_ENV,
      port: validated.APP_PORT,
      debug: validated.NODE_ENV === Environment.DEVELOPMENT,
    },
    database: {
      host: validated.DATABASE_HOST,
      port: validated.DATABASE_PORT,
      username: validated.DATABASE_USERNAME,
      password: validated.DATABASE_PASSWORD,
      database: validated.DATABASE_NAME,
      ssl: validated.NODE_ENV === Environment.PRODUCTION,
      logging: validated.NODE_ENV === Environment.DEVELOPMENT,
    },
    redis: {
      host: validated.REDIS_HOST,
      port: validated.REDIS_PORT,
      password: validated.REDIS_PASSWORD,
      keyPrefix: 'hoa:',
    },
    jwt: {
      secret: validated.JWT_SECRET,
      expiresIn: validated.JWT_EXPIRES_IN,
    },
    cors: {
      origin: validated.CORS_ORIGIN,
      credentials: true,
    },
    upload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      destination: './uploads',
    },
    security: {
      bcryptRounds: validated.BCRYPT_ROUNDS,
      maxLoginAttempts: validated.MAX_LOGIN_ATTEMPTS,
      accountLockTime: validated.ACCOUNT_LOCK_TIME,
      passwordMinLength: 8,
      passwordMaxLength: 128,
      mfaIssuer: 'HOA Platform',
      mfaRequiredRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
        UserRole.TENANT_ADMIN,
        UserRole.ADMIN_HEAD,
        UserRole.SECURITY_HEAD,
      ],
    },
    email: {
      host: validated.SMTP_HOST,
      port: validated.SMTP_PORT,
      user: validated.SMTP_USER,
      password: validated.SMTP_PASS,
      secure: validated.SMTP_PORT === 465,
    },
    payment: {
      stripeSecretKey: validated.STRIPE_SECRET_KEY,
      paypalClientId: validated.PAYPAL_CLIENT_ID,
      paypalClientSecret: validated.PAYPAL_CLIENT_SECRET,
      sandbox: true,
    },
  };
}