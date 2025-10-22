import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { GuestsRepository } from './guests.repository';
import { GuestEntity } from './entities/guest.entity';
import { HouseholdsRepository } from '../households/households.repository';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { AuditService } from '@hoa-platform/shared';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuestEntity,
      NotificationEntity,
    ]),
    SecurityModule,
  ],
  controllers: [GuestsController],
  providers: [
    GuestsService,
    GuestsRepository,
    HouseholdsRepository,
    UsersRepository,
    NotificationsService,
    NotificationsRepository,
    AuditService,
  ],
  exports: [
    GuestsService,
    GuestsRepository,
  ],
})
export class GuestsModule {}