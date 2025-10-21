import { Injectable } from '@nestjs/common';
import { HouseholdsRepository } from './households.repository';
import { CreateHouseholdDto, UpdateHouseholdDto, SearchHouseholdsDto, HouseholdEntity } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly householdsRepository: HouseholdsRepository,
    private readonly auditService: AuditService,
    private readonly tenantsService: TenantsService,
  ) {}

  async create(createHouseholdDto: CreateHouseholdDto): Promise<HouseholdEntity> {
    const household = await this.householdsRepository.create(createHouseholdDto);

    // Update tenant household count
    await this.tenantsService.updateHouseholdCount(createHouseholdDto.tenant_id, 1);

    return household;
  }

  async findAll(options: SearchHouseholdsDto = {}, tenantId?: string): Promise<{
    households: HouseholdEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.householdsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<HouseholdEntity> {
    return await this.householdsRepository.findOne(id);
  }

  @Audit('update', 'household')
  async update(id: string, updateHouseholdDto: UpdateHouseholdDto): Promise<HouseholdEntity> {
    return await this.householdsRepository.update(id, updateHouseholdDto);
  }

  @Audit('delete', 'household')
  async remove(id: string): Promise<void> {
    const household = await this.findOne(id);

    // Update tenant household count
    await this.tenantsService.updateHouseholdCount(household.tenant_id, -1);

    await this.householdsRepository.remove(id);
  }

  async activate(id: string): Promise<HouseholdEntity> {
    return await this.householdsRepository.activate(id);
  }

  async deactivate(id: string): Promise<HouseholdEntity> {
    return await this.householdsRepository.deactivate(id);
  }

  async findByHeadUserId(headUserId: string): Promise<HouseholdEntity | null> {
    return await this.householdsRepository.findByHeadUserId(headUserId);
  }

  async findByTenant(tenantId: string, options: SearchHouseholdsDto = {}): Promise<{
    households: HouseholdEntity[];
    total: number;
  }> {
    return await this.householdsRepository.findByTenant(tenantId, options);
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_property_type: Record<string, number>;
    owner_occupied: number;
    rented: number;
    average_parking_spaces: number;
    total_parking_spaces: number;
  }> {
    return await this.householdsRepository.getStatistics(tenantId);
  }

  async assignHeadUser(householdId: string, userId: string): Promise<HouseholdEntity> {
    return await this.householdsRepository.update(householdId, { head_user_id: userId });
  }

  async removeHeadUser(householdId: string): Promise<HouseholdEntity> {
    return await this.householdsRepository.update(householdId, { head_user_id: null });
  }
}