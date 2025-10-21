import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantsRepository } from './tenants.repository';
import { TenantEntity } from './entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService, TenantsRepository],
})
export class TenantsModule {}