import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { TenantEntity, TenantStatus } from './entities/tenant.entity';
import { CreateTenantDto, UpdateTenantDto, SearchTenantsDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';

@Injectable()
export class TenantsRepository {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantEntity> {
    // Check if subdomain already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { subdomain: createTenantDto.subdomain },
    });

    if (existingTenant) {
      throw new ConflictError('Tenant with this subdomain already exists', {
        subdomain: createTenantDto.subdomain,
      });
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      status: TenantStatus.ACTIVE,
      current_households: 0,
    });

    return await this.tenantRepository.save(tenant);
  }

  async findAll(options: SearchTenantsDto = {}): Promise<{
    tenants: TenantEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, status, is_active } = options;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    if (status) {
      whereConditions.status = status;
    }

    if (typeof is_active === 'boolean') {
      whereConditions.is_active = is_active;
    }

    const findOptions: FindManyOptions<TenantEntity> = {
      where: whereConditions,
      skip,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    };

    const [tenants, total] = await this.tenantRepository.findAndCount(findOptions);

    return {
      tenants,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });

    if (!tenant) {
      throw new NotFoundError('Tenant', id);
    }

    return tenant;
  }

  async findBySubdomain(subdomain: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({
      where: { subdomain, is_active: true },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant with subdomain', subdomain);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.findOne(id);

    // Check if subdomain is being changed and if it conflicts
    if (updateTenantDto.subdomain && updateTenantDto.subdomain !== tenant.subdomain) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { subdomain: updateTenantDto.subdomain },
      });

      if (existingTenant) {
        throw new ConflictError('Tenant with this subdomain already exists', {
          subdomain: updateTenantDto.subdomain,
        });
      }
    }

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);

    // Check if tenant has households
    if (tenant.current_households > 0) {
      throw new ValidationError('Cannot delete tenant with existing households', {
        current_households: tenant.current_households,
      });
    }

    await this.tenantRepository.remove(tenant);
  }

  async updateHouseholdCount(id: string, increment: number): Promise<void> {
    await this.tenantRepository.manager.increment(
      TenantEntity,
      { id },
      'current_households',
      increment,
    );
  }

  async activate(id: string): Promise<TenantEntity> {
    const tenant = await this.findOne(id);
    tenant.is_active = true;
    tenant.status = TenantStatus.ACTIVE;
    return await this.tenantRepository.save(tenant);
  }

  async deactivate(id: string): Promise<TenantEntity> {
    const tenant = await this.findOne(id);
    tenant.is_active = false;
    tenant.status = TenantStatus.INACTIVE;
    return await this.tenantRepository.save(tenant);
  }

  async suspend(id: string, reason?: string): Promise<TenantEntity> {
    const tenant = await this.findOne(id);
    tenant.is_active = false;
    tenant.status = TenantStatus.SUSPENDED;

    if (reason) {
      tenant.settings = {
        ...tenant.settings,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
      };
    }

    return await this.tenantRepository.save(tenant);
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    total_households: number;
    average_households_per_tenant: number;
  }> {
    const [
      total,
      active,
      inactive,
      suspended,
      householdStats,
    ] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { status: TenantStatus.ACTIVE } }),
      this.tenantRepository.count({ where: { status: TenantStatus.INACTIVE } }),
      this.tenantRepository.count({ where: { status: TenantStatus.SUSPENDED } }),
      this.tenantRepository
        .createQueryBuilder('tenant')
        .select('SUM(tenant.current_households)', 'total')
        .addSelect('AVG(tenant.current_households)', 'average')
        .getRawOne(),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      total_households: parseInt(householdStats.total) || 0,
      average_households_per_tenant: parseFloat(householdStats.average) || 0,
    };
  }
}