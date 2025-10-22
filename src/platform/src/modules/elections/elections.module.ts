import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { ElectionsController } from './elections.controller';
import { ElectionsService } from './elections.service';
import { ElectionsRepository } from './elections.repository';
import { ElectionEntity } from './entities/election.entity';
import { UsersService } from '../users/users.service';
import { UsersRepository } from '../users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '@hoa-platform/shared';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ElectionEntity]),
    ConfigModule,
    ScheduleModule.forRoot(),
    SecurityModule,
  ],
  controllers: [ElectionsController],
  providers: [
    ElectionsService,
    ElectionsRepository,
    UsersService,
    UsersRepository,
    NotificationsService,
    AuditService,
  ],
  exports: [
    ElectionsService,
    ElectionsRepository,
  ],
})
export class ElectionsModule {}