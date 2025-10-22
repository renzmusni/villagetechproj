import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { NotificationEntity } from './entities/notification.entity';
import { AuditService } from '@hoa-platform/shared';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    ConfigModule,
    ScheduleModule.forRoot(),
    SecurityModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    AuditService,
  ],
  exports: [
    NotificationsService,
    NotificationsRepository,
  ],
})
export class NotificationsModule {}