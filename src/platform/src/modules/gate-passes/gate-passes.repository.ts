import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not, LessThan, MoreThan, Between } from 'typeorm';
import { GatePassEntity, GatePassType, GatePassStatus } from './entities/gate-pass.entity';
import { CreateGatePassDto, UpdateGatePassDto, SearchGatePassesDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';
import { VehiclesRepository } from '../vehicles/vehicles.repository';
import { SecurityUtils } from '@hoa-platform/shared';
import * as qrcode from 'qrcode';

@Injectable()
export class GatePassesRepository {
  constructor(
    @InjectRepository(GatePassEntity)
    private readonly gatePassesRepository: Repository<GatePassEntity>,
    private readonly vehiclesRepository: VehiclesRepository,
  ) {}

  async create(createGatePassDto: CreateGatePassDto): Promise<GatePassEntity> {
    // Validate vehicle exists
    const vehicle = await this.vehiclesRepository.findOne(createGatePassDto.vehicle_id);
    if (!vehicle) {
      throw new NotFoundError('Vehicle', createGatePassDto.vehicle_id);
    }

    // Validate dates
    if (new Date(createGatePassDto.start_date) >= new Date(createGatePassDto.end_date)) {
      throw new ValidationError('End date must be after start date');
    }

    // Check for overlapping active passes for the same vehicle
    const overlappingPass = await this.findOverlappingPass(
      createGatePassDto.vehicle_id,
      createGatePassDto.start_date,
      createGatePassDto.end_date,
    );

    if (overlappingPass && overlappingPass.is_active) {
      throw new ConflictError('Vehicle already has an active pass for this period', {
        vehicle_id: createGatePassDto.vehicle_id,
        pass_id: overlappingPass.id,
      });
    }

    const gatePass = this.gatePassesRepository.create(createGatePassDto);

    // Generate QR code
    const qrData = await this.generateQRCode(gatePass);
    gatePass.qr_code = qrData.url;
    gatePass.qr_code_data = qrData.data;
    gatePass.barcode = this.generateBarcode(gatePass);
    gatePass.is_scannable = true;

    return await this.gatePassesRepository.save(gatePass);
  }

  async findAll(options: SearchGatePassesDto = {}, tenantId?: string): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, status, pass_type, is_active, vehicle_id, created_by } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoinAndSelect('gatePass.vehicle', 'vehicle')
      .leftJoinAndSelect('gatePass.creator', 'creator')
      .leftJoinAndSelect('gatePass.approver', 'approver')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(gatePass.visitor_name ILIKE :search OR gatePass.purpose ILIKE :search OR vehicle.make ILIKE :search OR vehicle.model ILIKE :search OR vehicle.license_plate ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('gatePass.status = :status', { status });
    }

    if (pass_type) {
      queryBuilder.andWhere('gatePass.pass_type = :passType', { passType: pass_type });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere('gatePass.start_date <= :now AND gatePass.end_date >= :now', {
          now: new Date(),
        });
      } else {
        queryBuilder.andWhere(
          '(gatePass.start_date > :now OR gatePass.end_date < :now OR gatePass.status != :activeStatus)',
          { now: new Date(), activeStatus: GatePassStatus.ACTIVE },
        );
      }
    }

    if (vehicle_id) {
      queryBuilder.andWhere('gatePass.vehicle_id = :vehicleId', { vehicleId });
    }

    if (created_by) {
      queryBuilder.andWhere('gatePass.created_by = :createdBy', { createdBy });
    }

    const [gatePasses, total] = await queryBuilder
      .orderBy('gatePass.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      gatePasses,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<GatePassEntity> {
    const gatePass = await this.gatePassesRepository.findOne({
      where: { id },
      relations: ['vehicle', 'creator', 'approver', 'access_logs'],
    });

    if (!gatePass) {
      throw new NotFoundError('Gate Pass', id);
    }

    return gatePass;
  }

  async findByQRCode(qrCodeData: string): Promise<GatePassEntity | null> {
    return await this.gatePassesRepository.findOne({
      where: { qr_code_data: qrCodeData },
      relations: ['vehicle', 'vehicle.household'],
    });
  }

  async findByBarcode(barcode: string): Promise<GatePassEntity | null> {
    return await this.gatePassesRepository.findOne({
      where: { barcode },
      relations: ['vehicle', 'vehicle.household'],
    });
  }

  async findByVehicle(vehicleId: string, options: SearchGatePassesDto = {}): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
  }> {
    const { status, pass_type, is_active } = options;

    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoinAndSelect('gatePass.vehicle', 'vehicle')
      .where('gatePass.vehicle_id = :vehicleId', { vehicleId });

    if (status) {
      queryBuilder.andWhere('gatePass.status = :status', { status });
    }

    if (pass_type) {
      queryBuilder.andWhere('gatePass.pass_type = :passType', { passType: pass_type });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere('gatePass.start_date <= :now AND gatePass.end_date >= :now', {
          now: new Date(),
        });
      } else {
        queryBuilder.andWhere(
          '(gatePass.start_date > :now OR gatePass.end_date < :now OR gatePass.status != :activeStatus)',
          { now: new Date(), activeStatus: GatePassStatus.ACTIVE },
        );
      }
    }

    const [gatePasses, total] = await queryBuilder
      .orderBy('gatePass.created_at', 'DESC')
      .getManyAndCount();

    return { gatePasses, total };
  }

  async findByTenant(tenantId: string, options: SearchGatePassesDto = {}): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
  }> {
    const { search, status, pass_type, is_active, vehicle_id, created_by } = options;

    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoinAndSelect('gatePass.vehicle', 'vehicle')
      .leftJoinAndSelect('gatePass.creator', 'creator')
      .leftJoinAndSelect('vehicle.household', 'household')
      .where('household.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(gatePass.visitor_name ILIKE :search OR gatePass.purpose ILIKE :search OR vehicle.make ILIKE :search OR vehicle.model ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('gatePass.status = :status', { status });
    }

    if (pass_type) {
      queryBuilder.andWhere('gatePass.pass_type = :passType', { passType: pass_type });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere('gatePass.start_date <= :now AND gatePass.end_date >= :now', {
          now: new Date(),
        });
      } else {
        queryBuilder.andWhere(
          '(gatePass.start_date > :now OR gatePass.end_date < :now OR gatePass.status != :activeStatus)',
          { now: new Date(), activeStatus: GatePassStatus.ACTIVE },
        );
      }
    }

    if (vehicle_id) {
      queryBuilder.andWhere('gatePass.vehicle_id = :vehicleId', { vehicleId });
    }

    if (created_by) {
      queryBuilder.andWhere('gatePass.created_by = :createdBy', { createdBy });
    }

    const [gatePasses, total] = await queryBuilder
      .orderBy('gatePass.created_at', 'DESC')
      .getManyAndCount();

    return { gatePasses, total };
  }

  async update(id: string, updateGatePassDto: UpdateGatePassDto): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);

    // Validate dates if being updated
    if (updateGatePassDto.start_date && updateGatePassDto.end_date) {
      if (new Date(updateGatePassDto.start_date) >= new Date(updateGatePassDto.end_date)) {
        throw new ValidationError('End date must be after start date');
      }

      // Check for overlapping passes if dates are changing
      if (updateGatePassDto.start_date !== gatePass.start_date || updateGatePassDto.end_date !== gatePass.end_date) {
        const overlappingPass = await this.findOverlappingPass(
          gatePass.vehicle_id,
          updateGatePassDto.start_date,
          updateGatePassDto.end_date,
          gatePass.id,
        );

        if (overlappingPass && overlappingPass.is_active) {
          throw new ConflictError('Vehicle already has an active pass for this period', {
            vehicle_id: gatePass.vehicle_id,
            pass_id: overlappingPass.id,
          });
        }
      }
    }

    Object.assign(gatePass, updateGatePassDto);

    // Regenerate QR code if relevant data changed
    if (updateGatePassDto.start_date || updateGatePassDto.end_date || updateGatePassDto.visitor_name) {
      const qrData = await this.generateQRCode(gatePass);
      gatePass.qr_code = qrData.url;
      gatePass.qr_code_data = qrData.data;
    }

    return await this.gatePassesRepository.save(gatePass);
  }

  async remove(id: string): Promise<void> {
    const gatePass = await this.findOne(id);
    await this.gatePassesRepository.remove(gatePass);
  }

  async activate(id: string): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);
    gatePass.status = GatePassStatus.ACTIVE;
    return await this.gatePassesRepository.save(gatePass);
  }

  async deactivate(id: string): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);
    gatePass.status = GatePassStatus.INACTIVE;
    return await this.gatePassesRepository.save(gatePass);
  }

  async revoke(id: string, revokedBy: string, reason?: string): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);
    gatePass.status = GatePassStatus.REVOKED;
    gatePass.revoked_at = new Date();
    gatePass.revoked_by = revokedBy;
    gatePass.revoke_reason = reason;
    return await this.gatePassesRepository.save(gatePass);
  }

  async recordUsage(id: string, entryPoint: string): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);

    if (!gatePass.is_valid) {
      throw new ValidationError('Gate pass is not valid for use');
    }

    gatePass.current_entries += 1;
    gatePass.last_used_at = new Date();
    gatePass.last_entry_point = entryPoint;

    // Auto-deactivate if max entries reached
    if (!gatePass.unlimited_access && gatePass.current_entries >= gatePass.max_entries) {
      gatePass.status = GatePassStatus.EXPIRED;
    }

    return await this.gatePassesRepository.save(gatePass);
  }

  async getExpiringPasses(days: number = 7): Promise<GatePassEntity[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoinAndSelect('gatePass.vehicle', 'vehicle')
      .leftJoinAndSelect('gatePass.creator', 'creator')
      .where('gatePass.end_date <= :expiryDate', { expiryDate })
      .andWhere('gatePass.end_date >= :today', { today: new Date() })
      .andWhere('gatePass.status = :status', { status: GatePassStatus.ACTIVE })
      .orderBy('gatePass.end_date', 'ASC')
      .getMany();
  }

  async getActivePassesCount(tenantId?: string): Promise<number> {
    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoin('gatePass.vehicle', 'vehicle')
      .leftJoin('vehicle.household', 'household')
      .where('gatePass.start_date <= :now', { now: new Date() })
      .andWhere('gatePass.end_date >= :now', { now: new Date() })
      .andWhere('gatePass.status = :status', { status: GatePassStatus.ACTIVE });

    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    return await queryBuilder.getCount();
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    revoked: number;
    by_pass_type: Record<string, number>;
    total_entries_today: number;
    expiring_soon: number;
  }> {
    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .leftJoin('gatePass.vehicle', 'vehicle')
      .leftJoin('vehicle.household', 'household');

    if (tenantId) {
      queryBuilder.where('household.tenant_id = :tenantId', { tenantId });
    }

    const [
      total,
      active,
      inactive,
      expired,
      revoked,
      passTypeStats,
      todayEntries,
      expiringSoon,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder
        .clone()
        .where('gatePass.start_date <= :now AND gatePass.end_date >= :now AND gatePass.status = :status', {
          now: new Date(),
          status: GatePassStatus.ACTIVE,
        })
        .getCount(),
      queryBuilder
        .clone()
        .where('gatePass.status = :status', { status: GatePassStatus.INACTIVE })
        .getCount(),
      queryBuilder
        .clone()
        .where('gatePass.status = :status', { status: GatePassStatus.EXPIRED })
        .getCount(),
      queryBuilder
        .clone()
        .where('gatePass.status = :status', { status: GatePassStatus.REVOKED })
        .getCount(),
      queryBuilder
        .clone()
        .select('gatePass.pass_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('gatePass.pass_type')
        .getRawMany(),
      queryBuilder
        .clone()
        .where('gatePass.last_used_at >= :today', {
          today: new Date().setHours(0, 0, 0, 0),
        })
        .select('SUM(gatePass.current_entries)', 'total_entries')
        .getRawOne(),
      queryBuilder
        .clone()
        .where('gatePass.end_date <= :weekFromNow AND gatePass.end_date >= :today AND gatePass.status = :status', {
          weekFromNow: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          today: new Date(),
          status: GatePassStatus.ACTIVE,
        })
        .getCount(),
    ]);

    const by_pass_type = passTypeStats.reduce((acc, stat) => {
      acc[stat.type] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      expired,
      revoked,
      by_pass_type,
      total_entries_today: parseInt(todayEntries.total_entries) || 0,
      expiring_soon,
    };
  }

  private async findOverlappingPass(
    vehicleId: string,
    startDate: string,
    endDate: string,
    excludeId?: string,
  ): Promise<GatePassEntity | null> {
    const queryBuilder = this.gatePassesRepository
      .createQueryBuilder('gatePass')
      .where('gatePass.vehicle_id = :vehicleId', { vehicleId })
      .andWhere('gatePass.status = :status', { status: GatePassStatus.ACTIVE })
      .andWhere(
        '(gatePass.start_date <= :endDate AND gatePass.end_date >= :startDate)',
        { startDate, endDate },
      );

    if (excludeId) {
      queryBuilder.andWhere('gatePass.id != :excludeId', { excludeId });
    }

    return await queryBuilder.getOne();
  }

  private async generateQRCode(gatePass: GatePassEntity): Promise<{ url: string; data: string }> {
    const qrData = {
      id: gatePass.id,
      vehicle_id: gatePass.vehicle_id,
      pass_type: gatePass.pass_type,
      start_date: gatePass.start_date.toISOString(),
      end_date: gatePass.end_date.toISOString(),
      status: gatePass.status,
      timestamp: Date.now(),
    };

    const encryptedData = Buffer.from(JSON.stringify(qrData)).toString('base64');

    const qrCodeUrl = await qrcode.toDataURL(JSON.stringify(qrData));

    return {
      url: qrCodeUrl,
      data: encryptedData,
    };
  }

  private generateBarcode(gatePass: GatePassEntity): string {
    // Generate a simple barcode based on gate pass ID and timestamp
    const data = `${gatePass.id}-${Date.now()}`;
    return data.replace(/-/g, '').substring(0, 12);
  }
}