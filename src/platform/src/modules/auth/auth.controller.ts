import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '@hoa-platform/shared';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
  EnableMfaDto,
  VerifyMfaDto,
  AuthenticationResponse,
  JwtPayload,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles } from '@hoa-platform/shared';
import { UserRole } from '@hoa-platform/shared';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Public()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto): Promise<AuthenticationResponse> {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 426, description: 'MFA required' })
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthenticationResponse> {
    return await this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<AuthenticationResponse> {
    return await this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: Request): Promise<{ message: string }> {
    // In a real implementation, you would invalidate the token here
    // For now, we'll just return a success message
    return { message: 'Logout successful' };
  }

  @Get('profile')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: Request): Promise<any> {
    const user = req.user as JwtPayload;
    return await this.authService.validateUser(user.email, '');
  }

  @Post('change-password')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Req() req: Request,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.changePassword(user.sub, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Post('enable-mfa')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable multi-factor authentication' })
  @ApiResponse({ status: 200, description: 'MFA setup initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enableMFA(
    @Req() req: Request,
    @Body(ValidationPipe) enableMfaDto: EnableMfaDto,
  ): Promise<{ secret: string; qrCode: string }> {
    const user = req.user as JwtPayload;
    return await this.authService.enableMfa(user.sub, enableMfaDto);
  }

  @Post('verify-mfa')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify and enable MFA' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyAndEnableMFA(
    @Req() req: Request,
    @Body(ValidationPipe) verifyMfaDto: VerifyMfaDto,
  ): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.verifyAndEnableMfa(user.sub, verifyMfaDto);
    return { message: 'MFA enabled successfully' };
  }

  @Post('disable-mfa')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable multi-factor authentication' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disableMFA(
    @Req() req: Request,
    @Body('password') password: string,
  ): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.disableMfa(user.sub, password);
    return { message: 'MFA disabled successfully' };
  }

  @Get('mfa-status')
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMFAStatus(@Req() req: Request): Promise<{ enabled: boolean }> {
    const user = req.user as JwtPayload;
    const userEntity = await this.authService.validateUser(user.email, '');
    return { enabled: userEntity?.mfa_enabled || false };
  }
}