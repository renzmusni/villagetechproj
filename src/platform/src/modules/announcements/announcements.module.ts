import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';

import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsRepository } from './announcements.repository';
import { AnnouncementEntity } from './entities/announcement.entity';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { HouseholdsService } from '../households/households.service';
import { HouseholdsRepository } from '../households/households.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '@hoa-platform/shared';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnnouncementEntity]),
    ConfigModule,
    ScheduleModule.forRoot(),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Accept common document and media formats
        const allowedMimes = [
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/bmp',
          'image/webp',
          'image/svg+xml',
          // Videos
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          'video/webm',
          // Audio
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
          'audio/mp4',
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
  controllers: [AnnouncementsController],
  providers: [
    AnnouncementsService,
    AnnouncementsRepository,
    UsersService,
    UsersRepository,
    HouseholdsService,
    HouseholdsRepository,
    NotificationsService,
    AuditService,
  ],
  exports: [
    AnnouncementsService,
    AnnouncementsRepository,
  ],
})
export class AnnouncementsModule {}