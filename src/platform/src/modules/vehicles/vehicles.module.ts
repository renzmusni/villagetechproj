import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehiclesRepository } from './vehicles.repository';
import { VehicleEntity } from './entities/vehicle.entity';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleEntity]), HouseholdsModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService, VehiclesRepository],
})
export class VehiclesModule {}