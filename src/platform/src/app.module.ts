// Root application module for HOA Community Platform

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { createConfig } from '@hoa-platform/shared';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { HouseholdsModule } from './modules/households/households.module';
import { ResidencesModule } from './modules/residences/residences.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { GatePassesModule } from './modules/gate-passes/gate-passes.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ConstructionPermitsModule } from './modules/construction-permits/construction-permits.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ElectionsModule } from './modules/elections/elections.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: createConfig,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        ssl: configService.get('database.ssl'),
        logging: configService.get('database.logging'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: configService.get('app.env') === 'development',
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: 60000, // 1 minute
          limit: 100, // 100 requests per minute
        },
      ],
      inject: [ConfigService],
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Static file serving
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    TenantsModule,
    HouseholdsModule,
    ResidencesModule,
    VehiclesModule,
    GatePassesModule,
    GuestsModule,
    ConstructionPermitsModule,
    AnnouncementsModule,
    ElectionsModule,
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