import { Injectable } from '@nestjs/common';
import { VehiclesRepository } from './vehicles.repository';
import { CreateVehicleDto, UpdateVehicleDto, SearchVehiclesDto, VehicleEntity } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleEntity> {
    return await this.vehiclesRepository.create(createVehicleDto);
  }

  async findAll(options: SearchVehiclesDto = {}, tenantId?: string): Promise<{
    vehicles: VehicleEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.vehiclesRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<VehicleEntity> {
    return await this.vehiclesRepository.findOne(id);
  }

  @Audit('update', 'vehicle')
  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleEntity> {
    return await this.vehiclesRepository.update(id, updateVehicleDto);
  }

  @Audit('delete', 'vehicle')
  async remove(id: string): Promise<void> {
    return await this.vehiclesRepository.remove(id);
  }

  async activate(id: string): Promise<VehicleEntity> {
    return await this.vehiclesRepository.activate(id);
  }

  async deactivate(id: string): Promise<VehicleEntity> {
    return await this.vehiclesRepository.deactivate(id);
  }

  async findByLicensePlate(licensePlate: string): Promise<VehicleEntity | null> {
    return await this.vehiclesRepository.findByLicensePlate(licensePlate);
  }

  async findByHousehold(householdId: string, options: SearchVehiclesDto = {}): Promise<{
    vehicles: VehicleEntity[];
    total: number;
  }> {
    return await this.vehiclesRepository.findByHousehold(householdId, options);
  }

  async findByTenant(tenantId: string, options: SearchVehiclesDto = {}): Promise<{
    vehicles: VehicleEntity[];
    total: number;
  }> {
    return await this.vehiclesRepository.findByTenant(tenantId, options);
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
    return await this.vehiclesRepository.getStatistics(tenantId);
  }

  async findExpiringRegistrations(days: number = 30): Promise<VehicleEntity[]> {
    return await this.vehiclesRepository.findExpiringRegistrations(days);
  }

  async findExpiringInsurance(days: number = 30): Promise<VehicleEntity[]> {
    return await this.vehiclesRepository.findExpiringInsurance(days);
  }

  async updateRegistrationExpiry(id: string, expiryDate: Date): Promise<VehicleEntity> {
    return await this.vehiclesRepository.update(id, {
      registration_expiry: expiryDate,
    });
  }

  async updateInsuranceExpiry(id: string, expiryDate: Date): Promise<VehicleEntity> {
    return await this.vehiclesRepository.update(id, {
      insurance_expiry: expiryDate,
    });
  }

  async transferVehicle(vehicleId: string, newHouseholdId: string): Promise<VehicleEntity> {
    return await this.vehiclesRepository.update(vehicleId, {
      household_id: newHouseholdId,
    });
  }
}