import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not } from 'typeorm';
import { VehicleEntity } from './entities/vehicle.entity';
import { CreateVehicleDto, UpdateVehicleDto, SearchVehiclesDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';
import { HouseholdsRepository } from '../households/households.repository';

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(VehicleEntity)
    private readonly vehiclesRepository: Repository<VehicleEntity>,
    private readonly householdsRepository: HouseholdsRepository,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    // Check if license plate already exists in the tenant
    const existingVehicle = await this.vehiclesRepository.findOne({
      where: {
        license_plate: createVehicleDto.license_plate.toUpperCase(),
      },
    });

    if (existingVehicle) {
      throw new ConflictError('Vehicle with this license plate already exists', {
        license_plate: createVehicleDto.license_plate,
      });
    }

    // Validate that household exists
    await this.householdsRepository.findOne(createVehicleDto.household_id);

    const vehicle = this.vehiclesRepository.create({
      ...createVehicleDto,
      license_plate: createVehicleDto.license_plate.toUpperCase(),
      is_active: true,
    });

    return await this.vehiclesRepository.save(vehicle);
  }

  async findAll(options: SearchVehiclesDto = {}, tenantId?: string): Promise<{
    vehicles: VehicleEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, is_active, vehicle_type, fuel_type, is_commercial } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.license_plate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (typeof is_active === 'boolean') {
      queryBuilder.andWhere('vehicle.is_active = :isActive', { isActive: is_active });
    }

    if (vehicle_type) {
      queryBuilder.andWhere('vehicle.vehicle_type = :vehicleType', { vehicleType: vehicle_type });
    }

    if (fuel_type) {
      queryBuilder.andWhere('vehicle.fuel_type = :fuelType', { fuelType: fuel_type });
    }

    if (typeof is_commercial === 'boolean') {
      queryBuilder.andWhere('vehicle.is_commercial = :isCommercial', { isCommercial: is_commercial });
    }

    const [vehicles, total] = await queryBuilder
      .orderBy('vehicle.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      vehicles,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<VehicleEntity> {
    const vehicle = await this.vehiclesRepository.findOne({
      where: { id },
      relations: ['household'],
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle', id);
    }

    return vehicle;
  }

  async findByLicensePlate(licensePlate: string): Promise<VehicleEntity | null> {
    return await this.vehiclesRepository.findOne({
      where: { license_plate: licensePlate.toUpperCase() },
      relations: ['household'],
    });
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleEntity> {
    const vehicle = await this.findOne(id);

    // Check if license plate is being changed and if it conflicts
    if (updateVehicleDto.license_plate && updateVehicleDto.license_plate !== vehicle.license_plate) {
      const existingVehicle = await this.vehiclesRepository.findOne({
        where: {
          license_plate: updateVehicleDto.license_plate.toUpperCase(),
          id: Not(id),
        },
      });

      if (existingVehicle) {
        throw new ConflictError('Vehicle with this license plate already exists', {
          license_plate: updateVehicleDto.license_plate,
        });
      }
    }

    // Validate household if being changed
    if (updateVehicleDto.household_id && updateVehicleDto.household_id !== vehicle.household_id) {
      await this.householdsRepository.findOne(updateVehicleDto.household_id);
    }

    const updatedVehicle = {
      ...updateVehicleDto,
      license_plate: updateVehicleDto.license_plate?.toUpperCase(),
    };

    Object.assign(vehicle, updatedVehicle);
    return await this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.remove(vehicle);
  }

  async activate(id: string): Promise<VehicleEntity> {
    const vehicle = await this.findOne(id);
    vehicle.is_active = true;
    return await this.vehiclesRepository.save(vehicle);
  }

  async deactivate(id: string): Promise<VehicleEntity> {
    const vehicle = await this.findOne(id);
    vehicle.is_active = false;
    return await this.vehiclesRepository.save(vehicle);
  }

  async findByHousehold(householdId: string, options: SearchVehiclesDto = {}): Promise<{
    vehicles: VehicleEntity[];
    total: number;
  }> {
    const { search, is_active, vehicle_type, fuel_type, is_commercial } = options;

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.household_id = :householdId', { householdId });

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.license_plate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (typeof is_active === 'boolean') {
      queryBuilder.andWhere('vehicle.is_active = :isActive', { isActive: is_active });
    }

    if (vehicle_type) {
      queryBuilder.andWhere('vehicle.vehicle_type = :vehicleType', { vehicleType: vehicle_type });
    }

    if (fuel_type) {
      queryBuilder.andWhere('vehicle.fuel_type = :fuelType', { fuelType: fuel_type });
    }

    if (typeof is_commercial === 'boolean') {
      queryBuilder.andWhere('vehicle.is_commercial = :isCommercial', { isCommercial: is_commercial });
    }

    const [vehicles, total] = await queryBuilder
      .orderBy('vehicle.created_at', 'DESC')
      .getManyAndCount();

    return { vehicles, total };
  }

  async findByTenant(tenantId: string, options: SearchVehiclesDto = {}): Promise<{
    vehicles: VehicleEntity[];
    total: number;
  }> {
    const { search, is_active, vehicle_type, fuel_type, is_commercial } = options;

    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('household.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.license_plate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (typeof is_active === 'boolean') {
      queryBuilder.andWhere('vehicle.is_active = :isActive', { isActive: is_active });
    }

    if (vehicle_type) {
      queryBuilder.andWhere('vehicle.vehicle_type = :vehicleType', { vehicleType: vehicle_type });
    }

    if (fuel_type) {
      queryBuilder.andWhere('vehicle.fuel_type = :fuelType', { fuelType: fuel_type });
    }

    if (typeof is_commercial === 'boolean') {
      queryBuilder.andWhere('vehicle.is_commercial = :isCommercial', { isCommercial: is_commercial });
    }

    const [vehicles, total] = await queryBuilder
      .orderBy('vehicle.created_at', 'DESC')
      .getManyAndCount();

    return { vehicles, total };
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_vehicle_type: Record<string, number>;
    by_fuel_type: Record<string, number>;
    commercial: number;
    personal: number;
    registration_expired: number;
    insurance_expired: number;
    needs_attention: number;
  }> {
    const queryBuilder = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoin('vehicle.household', 'household');

    if (tenantId) {
      queryBuilder.where('household.tenant_id = :tenantId', { tenantId });
    }

    const [
      total,
      active,
      inactive,
      vehicleTypeStats,
      fuelTypeStats,
      commercialStats,
      expiredStats,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('vehicle.is_active = true').getCount(),
      queryBuilder.clone().andWhere('vehicle.is_active = false').getCount(),
      queryBuilder
        .clone()
        .select('vehicle.vehicle_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('vehicle.vehicle_type')
        .getRawMany(),
      queryBuilder
        .clone()
        .select('vehicle.fuel_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('vehicle.fuel_type')
        .getRawMany(),
      queryBuilder
        .clone()
        .select('vehicle.is_commercial', 'commercial')
        .addSelect('COUNT(*)', 'count')
        .groupBy('vehicle.is_commercial')
        .getRawMany(),
      queryBuilder
        .clone()
        .where('vehicle.registration_expiry < :now OR vehicle.insurance_expiry < :now', { now: new Date() })
        .select('COUNT(*)', 'expired_count')
        .addSelect('COUNT(CASE WHEN vehicle.registration_expiry < :now THEN 1 END)', 'registration_expired')
        .addSelect('COUNT(CASE WHEN vehicle.insurance_expiry < :now THEN 1 END)', 'insurance_expired')
        .getRawOne(),
    ]);

    const by_vehicle_type = vehicleTypeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    const by_fuel_type = fuelTypeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    const commercialData = commercialStats.reduce(
      (acc, stat) => {
        acc[stat.commercial ? 'commercial' : 'personal'] = parseInt(stat.count);
        return acc;
      },
      { commercial: 0, personal: 0 },
    );

    return {
      total,
      active,
      inactive,
      by_vehicle_type,
      by_fuel_type,
      ...commercialData,
      registration_expired: parseInt(expiredStats.registration_expired) || 0,
      insurance_expired: parseInt(expiredStats.insurance_expiry) || 0,
      needs_attention: parseInt(expiredStats.expired_count) || 0,
    };
  }

  async findExpiringRegistrations(days: number = 30): Promise<VehicleEntity[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('vehicle.registration_expiry <= :expiryDate', { expiryDate })
      .andWhere('vehicle.registration_expiry >= :today', { today: new Date() })
      .andWhere('vehicle.is_active = true')
      .orderBy('vehicle.registration_expiry', 'ASC')
      .getMany();
  }

  async findExpiringInsurance(days: number = 30): Promise<VehicleEntity[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('vehicle.insurance_expiry <= :expiryDate', { expiryDate })
      .andWhere('vehicle.insurance_expiry >= :today', { today: new Date() })
      .andWhere('vehicle.is_active = true')
      .orderBy('vehicle.insurance_expiry', 'ASC')
      .getMany();
  }
}