// Root application module for HOA Community Platform

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HouseholdsModule } from './modules/households/households.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'hoa_admin',
      password: process.env.DATABASE_PASSWORD || 'secure_password',
      database: process.env.DATABASE_NAME || 'hoa_platform',
      ssl: process.env.NODE_ENV === 'production',
      logging: process.env.NODE_ENV === 'development',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    HouseholdsModule,
    VehiclesModule,
  ],
})
export class AppModule {
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    console.log('🏗️  HOA Community Platform initialized');
    console.log(`📊 Environment: ${this.configService.get('app.env')}`);
    console.log(`🔌 Database: ${this.configService.get('database.host')}:${this.configService.get('database.port')}`);
    console.log(`🗄️  Redis: ${this.configService.get('redis.host')}:${this.configService.get('redis.port')}`);
  }
}