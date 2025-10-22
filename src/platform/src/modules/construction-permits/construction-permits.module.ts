import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';

import { ConstructionPermitsController } from './construction-permits.controller';
import { ConstructionPermitsService } from './construction-permits.service';
import { ConstructionPermitsRepository } from './construction-permits.repository';
import { ConstructionPermitEntity } from './entities/construction-permit.entity';
import { HouseholdsRepository } from '../households/households.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '@hoa-platform/shared';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConstructionPermitEntity]),
    ConfigModule,
    ScheduleModule.forRoot(),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Accept common document formats
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/bmp',
          'image/webp',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file type'), false);
        }
      },
    }),
    SecurityModule,
  ],
  controllers: [ConstructionPermitsController],
  providers: [
    ConstructionPermitsService,
    ConstructionPermitsRepository,
    HouseholdsRepository,
    UsersRepository,
    NotificationsService,
    AuditService,
  ],
  exports: [
    ConstructionPermitsService,
    ConstructionPermitsRepository,
  ],
})
export class ConstructionPermitsModule {}