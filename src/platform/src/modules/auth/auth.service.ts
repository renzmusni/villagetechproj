// Authentication service for HOA Community Platform

import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

import { UserEntity } from '../users/entities/user.entity';
import {
  CreateUserDto,
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  EnableMfaDto,
  VerifyMfaDto,
  JwtPayload,
  AuthenticationResponse,
  UserRole
} from '@hoa-platform/shared';
import {
  AuthenticationError,
  ValidationError,
  MFARequiredError,
  ConflictError,
  SecurityUtils,
  ValidationUtils
} from '@hoa-platform/shared';

interface LoginDto {
  email: string;
  password: string;
  mfaCode?: string;
}

interface RegisterDto extends CreateUserDto {
  confirmPassword: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface EnableMfaDto {
  password: string;
}

interface VerifyMfaDto {
  token: string;
}

interface AuthenticationResponse {
  user: Omit<UserEntity, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
  requiresMfa?: boolean;
  mfaSecret?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthenticationResponse> {
    // Validate input
    if (!ValidationUtils.isValidEmail(registerDto.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!ValidationUtils.isValidPassword(registerDto.password)) {
      throw new ValidationError('Password does not meet security requirements');
    }

    if (registerDto.password !== registerDto.confirmPassword) {
      throw new ValidationError('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create new user
    const hashedPassword = await SecurityUtils.hashPassword(registerDto.password);
    const user = this.usersRepository.create({
      ...registerDto,
      password_hash: hashedPassword,
      is_active: true,
    });

    delete user.password;
    delete registerDto.confirmPassword;

    const savedUser = await this.usersRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthenticationResponse> {
    const { email, password, mfaCode } = loginDto;

    // Find user with password
    const user = await this.usersRepository.findOne({
      where: { email, is_active: true },
      select: ['id', 'email', 'password_hash', 'role', 'mfa_enabled', 'mfa_secret', 'tenant_id'],
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await SecurityUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check MFA if enabled
    if (user.mfa_enabled && !mfaCode) {
      return {
        user: this.sanitizeUser(user),
        requiresMfa: true,
        accessToken: '',
        refreshToken: '',
      };
    }

    if (user.mfa_enabled && mfaCode) {
      const isMfaValid = this.verifyMfaToken(user.mfa_secret!, mfaCode);
      if (!isMfaValid) {
        throw new AuthenticationError('Invalid MFA code');
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthenticationResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub, is_active: true },
      });

      if (!user) {
        throw new AuthenticationError('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new ValidationError('New passwords do not match');
    }

    if (!ValidationUtils.isValidPassword(newPassword)) {
      throw new ValidationError('New password does not meet security requirements');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId, is_active: true },
      select: ['password_hash'],
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isCurrentPasswordValid = await SecurityUtils.comparePassword(
      currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const hashedNewPassword = await SecurityUtils.hashPassword(newPassword);
    await this.usersRepository.update(userId, {
      password_hash: hashedNewPassword,
      updated_at: new Date(),
    });
  }

  async enableMfa(userId: string, enableMfaDto: EnableMfaDto): Promise<{ secret: string; qrCode: string }> {
    const { password } = enableMfaDto;

    // Verify current password
    const user = await this.usersRepository.findOne({
      where: { id: userId, is_active: true },
      select: ['password_hash', 'email'],
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isPasswordValid = await SecurityUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `HOA Platform (${user.email})`,
      issuer: 'HOA Platform',
    });

    // Generate QR code
    const qrCode = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `HOA Platform (${user.email})`,
      issuer: 'HOA Platform',
    });

    // Temporarily store secret (not enabled yet)
    await this.usersRepository.update(userId, {
      mfa_secret: secret.base32,
    });

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  async verifyAndEnableMfa(userId: string, verifyMfaDto: VerifyMfaDto): Promise<void> {
    const { token } = verifyMfaDto;

    const user = await this.usersRepository.findOne({
      where: { id: userId, is_active: true },
      select: ['mfa_secret'],
    });

    if (!user || !user.mfa_secret) {
      throw new AuthenticationError('MFA setup not initiated');
    }

    const isTokenValid = this.verifyMfaToken(user.mfa_secret, token);
    if (!isTokenValid) {
      throw new AuthenticationError('Invalid MFA token');
    }

    // Enable MFA
    await this.usersRepository.update(userId, {
      mfa_enabled: true,
      updated_at: new Date(),
    });
  }

  async disableMfa(userId: string, password: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, is_active: true },
      select: ['password_hash'],
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const isPasswordValid = await SecurityUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }

    await this.usersRepository.update(userId, {
      mfa_enabled: false,
      mfa_secret: null,
      updated_at: new Date(),
    });
  }

  async validateUser(email: string, password: string): Promise<Omit<UserEntity, 'password_hash'> | null> {
    const user = await this.usersRepository.findOne({
      where: { email, is_active: true },
      select: ['id', 'email', 'password_hash', 'role', 'tenant_id'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await SecurityUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<Omit<UserEntity, 'password_hash'> | null> {
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub, is_active: true },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private verifyMfaToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time windows before/after current time
    });
  }

  private sanitizeUser(user: any): Omit<UserEntity, 'password_hash'> {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}