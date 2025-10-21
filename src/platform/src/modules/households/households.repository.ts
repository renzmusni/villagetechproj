import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { HouseholdEntity } from './entities/household.entity';
import { CreateHouseholdDto, UpdateHouseholdDto, SearchHouseholdsDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';

@Injectable()
export class HouseholdsRepository {
  constructor(
    @InjectRepository(HouseholdEntity)
    private readonly householdsRepository: Repository<HouseholdEntity>,
  ) {}

  async create(createHouseholdDto: CreateHouseholdDto): Promise<HouseholdEntity> {
    // Check if household with same address already exists in the tenant
    const existingHousehold = await this.householdsRepository.findOne({
      where: {
        tenant_id: createHouseholdDto.tenant_id,
        address: createHouseholdDto.address,
        unit_number: createHouseholdDto.unit_number,
      },
    });

    if (existingHousehold) {
      throw new ConflictError('Household with this address already exists', {
        address: createHouseholdDto.address,
        unit_number: createHouseholdDto.unit_number,
      });
    }

    const household = this.householdsRepository.create(createHouseholdDto);
    return await this.householdsRepository.save(household);
  }

  async findAll(options: SearchHouseholdsDto = {}, tenantId?: string): Promise<{
    households: HouseholdEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, is_active, property_type, is_owner_occupied } = options;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (tenantId) {
      whereConditions.tenant_id = tenantId;
    }

    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    if (typeof is_active === 'boolean') {
      whereConditions.is_active = is_active;
    }

    if (property_type) {
      whereConditions.property_type = property_type;
    }

    if (typeof is_owner_occupied === 'boolean') {
      whereConditions.is_owner_occupied = is_owner_occupied;
    }

    const findOptions: FindManyOptions<HouseholdEntity> = {
      where: whereConditions,
      skip,
      take: limit,
      relations: ['head_user'],
      order: {
        created_at: 'DESC',
      },
    };

    const [households, total] = await this.householdsRepository.findAndCount(findOptions);

    return {
      households,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<HouseholdEntity> {
    const household = await this.householdsRepository.findOne({
      where: { id },
      relations: ['head_user', 'members'],
    });

    if (!household) {
      throw new NotFoundError('Household', id);
    }

    return household;
  }

  async update(id: string, updateHouseholdDto: UpdateHouseholdDto): Promise<HouseholdEntity> {
    const household = await this.findOne(id);

    // Check if address is being changed and if it conflicts
    if (updateHouseholdDto.address || updateHouseholdDto.unit_number) {
      const newAddress = updateHouseholdDto.address || household.address;
      const newUnitNumber = updateHouseholdDto.unit_number || household.unit_number;

      const existingHousehold = await this.householdsRepository.findOne({
        where: {
          tenant_id: household.tenant_id,
          address: newAddress,
          unit_number: newUnitNumber,
          id: Not(id),
        },
      });

      if (existingHousehold) {
        throw new ConflictError('Household with this address already exists', {
          address: newAddress,
          unit_number: newUnitNumber,
        });
      }
    }

    Object.assign(household, updateHouseholdDto);
    return await this.householdsRepository.save(household);
  }

  async remove(id: string): Promise<void> {
    const household = await this.findOne(id);
    await this.householdsRepository.remove(household);
  }

  async activate(id: string): Promise<HouseholdEntity> {
    const household = await this.findOne(id);
    household.is_active = true;
    return await this.householdsRepository.save(household);
  }

  async deactivate(id: string): Promise<HouseholdEntity> {
    const household = await this.findOne(id);
    household.is_active = false;
    return await this.householdsRepository.save(household);
  }

  async findByHeadUserId(headUserId: string): Promise<HouseholdEntity | null> {
    return await this.householdsRepository.findOne({
      where: { head_user_id: headUserId },
      relations: ['members'],
    });
  }

  async findByTenant(tenantId: string, options: SearchHouseholdsDto = {}): Promise<{
    households: HouseholdEntity[];
    total: number;
  }> {
    const { search, is_active, property_type, is_owner_occupied } = options;

    const whereConditions: any = { tenant_id: tenantId };

    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    if (typeof is_active === 'boolean') {
      whereConditions.is_active = is_active;
    }

    if (property_type) {
      whereConditions.property_type = property_type;
    }

    if (typeof is_owner_occupied === 'boolean') {
      whereConditions.is_owner_occupied = is_owner_occupied;
    }

    const [households, total] = await this.householdsRepository.findAndCount({
      where: whereConditions,
      relations: ['head_user'],
      order: {
        created_at: 'DESC',
      },
    });

    return { households, total };
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
    const queryBuilder = this.householdsRepository.createQueryBuilder('household');

    if (tenantId) {
      queryBuilder.where('household.tenant_id = :tenantId', { tenantId });
    }

    const [
      total,
      active,
      inactive,
      propertyTypeStats,
      ownershipStats,
      parkingStats,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('household.is_active = true').getCount(),
      queryBuilder.clone().andWhere('household.is_active = false').getCount(),
      queryBuilder
        .clone()
        .select('household.property_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('household.property_type')
        .getRawMany(),
      queryBuilder
        .clone()
        .select('household.is_owner_occupied', 'owner_occupied')
        .addSelect('COUNT(*)', 'count')
        .groupBy('household.is_owner_occupied')
        .getRawMany(),
      queryBuilder
        .clone()
        .select('SUM(household.parking_spaces)', 'total')
        .addSelect('AVG(household.parking_spaces)', 'average')
        .getRawOne(),
    ]);

    const by_property_type = propertyTypeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    const ownershipData = ownershipStats.reduce(
      (acc, stat) => {
        acc[stat.owner_occupied ? 'owner_occupied' : 'rented'] = parseInt(stat.count);
        return acc;
      },
      { owner_occupied: 0, rented: 0 },
    );

    return {
      total,
      active,
      inactive,
      by_property_type,
      ...ownershipData,
      total_parking_spaces: parseInt(parkingStats.total) || 0,
      average_parking_spaces: parseFloat(parkingStats.average) || 0,
    };
  }
}

// Import Not fromtypeorm for the update function
import { Not } from 'typeorm';