import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload } from '@hoa-platform/shared';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      issuer: 'HOA Platform',
      audience: 'HOA Platform Users',
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    try {
      // Validate that the user still exists and is active
      const user = await this.authService.validateJwtPayload(payload);

      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Return user information that will be attached to the request object
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        tenant_id: payload.tenant_id,
        user, // Full user object without sensitive data
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}