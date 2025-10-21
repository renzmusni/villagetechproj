import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';
import { HouseholdsRepository } from './households.repository';
import { HouseholdEntity } from './entities/household.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([HouseholdEntity]), UsersModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService, HouseholdsRepository],
  exports: [HouseholdsService, HouseholdsRepository],
})
export class HouseholdsModule {}