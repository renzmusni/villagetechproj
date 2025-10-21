import { Injectable } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { CreateTenantDto, UpdateTenantDto, SearchTenantsDto } from '@hoa-platform/shared';
import { TenantEntity } from './entities/tenant.entity';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    return await this.tenantsRepository.create(createTenantDto);
  }

  async findAll(options: SearchTenantsDto = {}): Promise<{
    tenants: TenantEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.tenantsRepository.findAll(options);
  }

  async findOne(id: string): Promise<TenantEntity> {
    return await this.tenantsRepository.findOne(id);
  }

  async findBySubdomain(subdomain: string): Promise<TenantEntity> {
    return await this.tenantsRepository.findBySubdomain(subdomain);
  }

  @Audit('update', 'tenant')
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    return await this.tenantsRepository.update(id, updateTenantDto);
  }

  @Audit('delete', 'tenant')
  async remove(id: string): Promise<void> {
    return await this.tenantsRepository.remove(id);
  }

  async activate(id: string): Promise<TenantEntity> {
    return await this.tenantsRepository.activate(id);
  }

  async deactivate(id: string): Promise<TenantEntity> {
    return await this.tenantsRepository.deactivate(id);
  }

  async suspend(id: string, reason?: string): Promise<TenantEntity> {
    return await this.tenantsRepository.suspend(id, reason);
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    total_households: number;
    average_households_per_tenant: number;
  }> {
    return await this.tenantsRepository.getStatistics();
  }

  async updateHouseholdCount(id: string, increment: number): Promise<void> {
    return await this.tenantsRepository.updateHouseholdCount(id, increment);
  }
}