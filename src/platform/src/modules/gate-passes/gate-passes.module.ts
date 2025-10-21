import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GatePassesController } from './gate-passes.controller';
import { GatePassesService } from './gate-passes.service';
import { GatePassesRepository } from './gate-passes.repository';
import { GatePassEntity } from './entities/gate-pass.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [TypeOrmModule.forFeature([GatePassEntity]), VehiclesModule],
  controllers: [GatePassesController],
  providers: [GatePassesService, GatePassesRepository],
  exports: [GatePassesService, GatePassesRepository],
})
export class GatePassesModule {}