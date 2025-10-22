import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not, LessThan, MoreThan, Between } from 'typeorm';
import {
  ConstructionPermitEntity,
  PermitType,
  PermitStatus,
  PermitPriority,
  InspectionType,
} from './entities/construction-permit.entity';
import { CreatePermitDto, UpdatePermitDto, SearchPermitsDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';
import { HouseholdsRepository } from '../households/households.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class ConstructionPermitsRepository {
  constructor(
    @InjectRepository(ConstructionPermitEntity)
    private readonly permitsRepository: Repository<ConstructionPermitEntity>,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createPermitDto: Partial<ConstructionPermitEntity>): Promise<ConstructionPermitEntity> {
    // Validate household exists
    const household = await this.householdsRepository.findOne(createPermitDto.household_id);
    if (!household) {
      throw new NotFoundError('Household', createPermitDto.household_id);
    }

    // Validate dates
    if (createPermitDto.start_date && createPermitDto.completion_date) {
      if (new Date(createPermitDto.start_date) >= new Date(createPermitDto.completion_date)) {
        throw new ValidationError('Completion date must be after start date');
      }
    }

    // Generate unique permit number
    const permitNumber = await this.generatePermitNumber(household.tenant_id);

    const permit = this.permitsRepository.create({
      ...createPermitDto,
      permit_number: permitNumber,
    });

    return await this.permitsRepository.save(permit);
  }

  async findAll(options: SearchPermitsDto = {}, tenantId?: string): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      permit_type,
      status,
      priority,
      household_id,
      contractor_id,
      property_owner_id,
      is_active,
      requires_inspection,
      has_violations,
      is_overdue,
      start_date_from,
      start_date_to,
      completion_date_from,
      completion_date_to,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .leftJoinAndSelect('permit.architect', 'architect')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(permit.permit_number ILIKE :search OR permit.project_title ILIKE :search OR permit.project_description ILIKE :search OR permit.contractor_info->>\'name\' ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (permit_type) {
      queryBuilder.andWhere('permit.permit_type = :permitType', { permitType: permit_type });
    }

    if (status) {
      queryBuilder.andWhere('permit.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('permit.priority = :priority', { priority });
    }

    if (household_id) {
      queryBuilder.andWhere('permit.household_id = :householdId', { householdId });
    }

    if (contractor_id) {
      queryBuilder.andWhere('permit.contractor_id = :contractorId', { contractorId });
    }

    if (property_owner_id) {
      queryBuilder.andWhere('permit.property_owner_id = :propertyOwnerId', { propertyOwnerId });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere(
          '(permit.status IN (:...activeStatuses)) AND (permit.expires_date IS NULL OR permit.expires_date > :now)',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(permit.status NOT IN (:...activeStatuses) OR (permit.expires_date IS NOT NULL AND permit.expires_date <= :now))',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      }
    }

    if (typeof requires_inspection === 'boolean') {
      if (requires_inspection) {
        queryBuilder.andWhere(
          '(permit.status = :inspectionRequired OR permit.status = :inspectionScheduled OR (permit.status = :inProgress AND permit.next_inspection_date IS NOT NULL AND permit.next_inspection_date <= :now))',
          {
            inspectionRequired: PermitStatus.INSPECTION_REQUIRED,
            inspectionScheduled: PermitStatus.INSPECTION_SCHEDULED,
            inProgress: PermitStatus.IN_PROGRESS,
            now: new Date(),
          },
        );
      } else {
        queryBuilder.andWhere(
          'permit.status NOT IN (:...inspectionStatuses) AND (permit.next_inspection_date IS NULL OR permit.next_inspection_date > :now)',
          {
            inspectionStatuses: [
              PermitStatus.INSPECTION_REQUIRED,
              PermitStatus.INSPECTION_SCHEDULED,
              PermitStatus.INSPECTION_FAILED,
            ],
            now: new Date(),
          },
        );
      }
    }

    if (typeof has_violations === 'boolean') {
      if (has_violations) {
        queryBuilder.andWhere("permit.violations IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(permit.violations) AS v WHERE v->>'status' = 'open')");
      } else {
        queryBuilder.andWhere("permit.violations IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(permit.violations) AS v WHERE v->>'status' = 'open')");
      }
    }

    if (typeof is_overdue === 'boolean') {
      if (is_overdue) {
        queryBuilder.andWhere(
          'permit.completion_date < :now AND permit.status != :completed',
          { now: new Date(), completed: PermitStatus.COMPLETED },
        );
      } else {
        queryBuilder.andWhere(
          '(permit.completion_date >= :now OR permit.status = :completed)',
          { now: new Date(), completed: PermitStatus.COMPLETED },
        );
      }
    }

    if (start_date_from) {
      queryBuilder.andWhere('permit.start_date >= :startDateFrom', { startDateFrom: new Date(start_date_from) });
    }

    if (start_date_to) {
      queryBuilder.andWhere('permit.start_date <= :startDateTo', { startDateTo: new Date(start_date_to) });
    }

    if (completion_date_from) {
      queryBuilder.andWhere('permit.completion_date >= :completionDateFrom', { completionDateFrom: new Date(completion_date_from) });
    }

    if (completion_date_to) {
      queryBuilder.andWhere('permit.completion_date <= :completionDateTo', { completionDateTo: new Date(completion_date_to) });
    }

    const [permits, total] = await queryBuilder
      .orderBy('permit.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      permits,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.findOne({
      where: { id },
      relations: ['household', 'property_owner', 'contractor', 'architect'],
    });

    if (!permit) {
      throw new NotFoundError('Construction Permit', id);
    }

    return permit;
  }

  async findByPermitNumber(permitNumber: string): Promise<ConstructionPermitEntity | null> {
    return await this.permitsRepository.findOne({
      where: { permit_number: permitNumber },
      relations: ['household', 'property_owner', 'contractor', 'architect'],
    });
  }

  async findByHousehold(householdId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    const { status, is_active } = options;

    const queryBuilder = this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('permit.household_id = :householdId', { householdId });

    if (status) {
      queryBuilder.andWhere('permit.status = :status', { status });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere(
          '(permit.status IN (:...activeStatuses)) AND (permit.expires_date IS NULL OR permit.expires_date > :now)',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(permit.status NOT IN (:...activeStatuses) OR (permit.expires_date IS NOT NULL AND permit.expires_date <= :now))',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      }
    }

    const [permits, total] = await queryBuilder
      .orderBy('permit.created_at', 'DESC')
      .getManyAndCount();

    return { permits, total };
  }

  async findByContractor(contractorId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    const { status, is_active } = options;

    const queryBuilder = this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .where('permit.contractor_id = :contractorId', { contractorId });

    if (status) {
      queryBuilder.andWhere('permit.status = :status', { status });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere(
          '(permit.status IN (:...activeStatuses)) AND (permit.expires_date IS NULL OR permit.expires_date > :now)',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(permit.status NOT IN (:...activeStatuses) OR (permit.expires_date IS NOT NULL AND permit.expires_date <= :now))',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      }
    }

    const [permits, total] = await queryBuilder
      .orderBy('permit.created_at', 'DESC')
      .getManyAndCount();

    return { permits, total };
  }

  async findByTenant(tenantId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    const { status, is_active, permit_type } = options;

    const queryBuilder = this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('household.tenant_id = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('permit.status = :status', { status });
    }

    if (permit_type) {
      queryBuilder.andWhere('permit.permit_type = :permitType', { permitType: permit_type });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere(
          '(permit.status IN (:...activeStatuses)) AND (permit.expires_date IS NULL OR permit.expires_date > :now)',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(permit.status NOT IN (:...activeStatuses) OR (permit.expires_date IS NOT NULL AND permit.expires_date <= :now))',
          {
            activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
            now: new Date(),
          },
        );
      }
    }

    const [permits, total] = await queryBuilder
      .orderBy('permit.created_at', 'DESC')
      .getManyAndCount();

    return { permits, total };
  }

  async update(id: string, updatePermitDto: UpdatePermitDto): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    // Validate dates if being updated
    if (updatePermitDto.start_date && updatePermitDto.completion_date) {
      if (new Date(updatePermitDto.start_date) >= new Date(updatePermitDto.completion_date)) {
        throw new ValidationError('Completion date must be after start date');
      }
    }

    Object.assign(permit, updatePermitDto);

    return await this.permitsRepository.save(permit);
  }

  async remove(id: string): Promise<void> {
    const permit = await this.findOne(id);
    await this.permitsRepository.remove(permit);
  }

  async updateStatus(id: string, status: PermitStatus, updatedBy?: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.status = status;

    // Handle status-specific logic
    switch (status) {
      case PermitStatus.APPROVED:
        if (!permit.approval_workflow) {
          permit.approval_workflow = {};
        }
        permit.approval_workflow.approved_by = updatedBy;
        permit.approval_workflow.approved_at = new Date();
        break;

      case PermitStatus.ISSUED:
        if (!permit.approval_workflow) {
          permit.approval_workflow = {};
        }
        permit.issued_date = new Date();
        permit.approval_workflow.issued_by = updatedBy;
        permit.approval_workflow.issued_at = new Date();

        // Set expiry date (1 year from issue)
        permit.expires_date = new Date();
        permit.expires_date.setFullYear(permit.expires_date.getFullYear() + 1);
        break;

      case PermitStatus.IN_PROGRESS:
        permit.actual_start_date = new Date();
        break;

      case PermitStatus.COMPLETED:
        permit.actual_completion_date = new Date();
        permit.final_inspection_date = new Date();
        break;
    }

    return await this.permitsRepository.save(permit);
  }

  async scheduleInspection(
    id: string,
    inspectionData: {
      type: InspectionType;
      scheduled_date: Date;
      inspector_id: string;
      comments?: string;
    },
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.inspection_results) {
      permit.inspection_results = [];
    }

    // Find inspector name
    const inspector = await this.usersRepository.findOne(inspectionData.inspector_id);
    const inspectorName = inspector ? `${inspector.first_name} ${inspector.last_name}` : 'Unknown';

    permit.inspection_results.push({
      id: '', // Will be generated
      type: inspectionData.type,
      inspector_id: inspectionData.inspector_id,
      inspector_name: inspectorName,
      scheduled_date: inspectionData.scheduled_date,
      status: 'scheduled',
      comments: inspectionData.comments || '',
    });

    permit.next_inspection_date = inspectionData.scheduled_date;

    return await this.permitsRepository.save(permit);
  }

  async completeInspection(
    id: string,
    inspectionId: string,
    result: {
      status: 'passed' | 'failed';
      comments: string;
      photos?: string[];
      next_inspection?: string;
    },
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.inspection_results) {
      throw new ValidationError('No inspection results found for this permit');
    }

    const inspection = permit.inspection_results.find(i => i.id === inspectionId);
    if (!inspection) {
      throw new NotFoundError('Inspection', inspectionId);
    }

    inspection.status = result.status;
    inspection.comments = result.comments;
    inspection.completed_date = new Date();
    if (result.photos) {
      inspection.photos = result.photos;
    }
    if (result.next_inspection) {
      inspection.next_inspection = result.next_inspection;
    }

    permit.last_inspection_date = new Date();

    // Update permit status based on inspection result
    if (result.status === 'failed') {
      permit.status = PermitStatus.INSPECTION_FAILED;
    } else {
      // Check if all inspections are passed
      const pendingInspections = permit.inspection_results.filter(i =>
        i.status === 'scheduled' || i.status === 'failed'
      );

      if (pendingInspections.length === 0) {
        permit.status = PermitStatus.INSPECTION_PASSED;
      }
    }

    return await this.permitsRepository.save(permit);
  }

  async addViolation(
    id: string,
    violationData: {
      type: string;
      description: string;
      severity: 'minor' | 'major' | 'critical';
      fine?: number;
    },
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.violations) {
      permit.violations = [];
    }

    permit.violations.push({
      id: '', // Will be generated
      type: violationData.type,
      description: violationData.description,
      severity: violationData.severity,
      discovered_date: new Date(),
      status: 'open',
      fine: violationData.fine,
    });

    return await this.permitsRepository.save(permit);
  }

  async resolveViolation(id: string, violationId: string, resolutionDate?: Date): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.violations) {
      throw new ValidationError('No violations found for this permit');
    }

    const violation = permit.violations.find(v => v.id === violationId);
    if (!violation) {
      throw new NotFoundError('Violation', violationId);
    }

    violation.status = 'resolved';
    violation.resolved_date = resolutionDate || new Date();

    return await this.permitsRepository.save(permit);
  }

  async addProgressUpdate(
    id: string,
    updateData: {
      completion_percentage: number;
      description: string;
      photos?: string[];
      issues?: string[];
    },
    updatedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.progress_updates) {
      permit.progress_updates = [];
    }

    permit.progress_updates.push({
      id: '', // Will be generated
      update_date: new Date(),
      completion_percentage: Math.max(0, Math.min(100, updateData.completion_percentage)),
      description: updateData.description,
      photos: updateData.photos,
      issues: updateData.issues,
      updated_by: updatedBy,
    });

    return await this.permitsRepository.save(permit);
  }

  async extendPermit(id: string, newExpiryDate: Date, reason: string, extendedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.is_active) {
      throw new ValidationError('Only active permits can be extended');
    }

    const oldExpiryDate = permit.expires_date;
    permit.expires_date = newExpiryDate;

    if (!permit.change_orders) {
      permit.change_orders = [];
    }

    const durationChange = Math.ceil((newExpiryDate.getTime() - (oldExpiryDate?.getTime() || new Date().getTime())) / (1000 * 60 * 60 * 24));

    permit.change_orders.push({
      id: '', // Will be generated
      description: `Permit extension: ${reason}`,
      cost_change: 0,
      duration_change: durationChange,
      requested_date: new Date(),
      approved_date: new Date(),
      status: 'approved',
      approved_by: extendedBy,
    });

    return await this.permitsRepository.save(permit);
  }

  async getPendingApprovals(tenantId: string): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('permit.status IN (:...statuses)', {
        statuses: [PermitStatus.SUBMITTED, PermitStatus.UNDER_REVIEW],
      })
      .orderBy('permit.created_at', 'ASC')
      .getMany();
  }

  async getActivePermits(tenantId: string): Promise<ConstructionPermitEntity[]> {
    const now = new Date();

    return await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('permit.status IN (:...activeStatuses)', {
        activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
      })
      .andWhere('(permit.expires_date IS NULL OR permit.expires_date > :now)', { now })
      .orderBy('permit.start_date', 'ASC')
      .getMany();
  }

  async getOverduePermits(tenantId: string): Promise<ConstructionPermitEntity[]> {
    const now = new Date();

    return await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('permit.completion_date < :now', { now })
      .andWhere('permit.status != :completed', { completed: PermitStatus.COMPLETED })
      .orderBy('permit.completion_date', 'ASC')
      .getMany();
  }

  async getExpiringPermits(tenantId: string, daysThreshold: number = 30): Promise<ConstructionPermitEntity[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('permit.expires_date IS NOT NULL')
      .andWhere('permit.expires_date <= :thresholdDate', { thresholdDate })
      .andWhere('permit.expires_date > :now', { now: new Date() })
      .andWhere('permit.status IN (:...activeStatuses)', {
        activeStatuses: [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS],
      })
      .orderBy('permit.expires_date', 'ASC')
      .getMany();
  }

  async getPermitsRequiringInspection(tenantId: string): Promise<ConstructionPermitEntity[]> {
    const now = new Date();

    return await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoinAndSelect('permit.household', 'household')
      .leftJoinAndSelect('permit.property_owner', 'propertyOwner')
      .leftJoinAndSelect('permit.contractor', 'contractor')
      .leftJoinAndSelect('permit.inspection_results', 'inspection_results')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(permit.status = :inspectionRequired OR permit.status = :inspectionScheduled OR (permit.status = :inProgress AND permit.next_inspection_date IS NOT NULL AND permit.next_inspection_date <= :now))',
        {
          inspectionRequired: PermitStatus.INSPECTION_REQUIRED,
          inspectionScheduled: PermitStatus.INSPECTION_SCHEDULED,
          inProgress: PermitStatus.IN_PROGRESS,
          now,
        },
      )
      .orderBy('permit.next_inspection_date', 'ASC')
      .getMany();
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    issued: number;
    in_progress: number;
    inspection_required: number;
    completed: number;
    rejected: number;
    cancelled: number;
    expired: number;
    overdue: number;
    with_violations: number;
    by_type: Record<PermitType, number>;
    by_priority: Record<PermitPriority, number>;
    estimated_total_value: number;
    actual_total_value: number;
  }> {
    const queryBuilder = this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoin('permit.household', 'household');

    if (tenantId) {
      queryBuilder.where('household.tenant_id = :tenantId', { tenantId });
    }

    const permits = await queryBuilder.getMany();

    const stats = {
      total: permits.length,
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      issued: 0,
      in_progress: 0,
      inspection_required: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      expired: 0,
      overdue: 0,
      with_violations: 0,
      by_type: {} as Record<PermitType, number>,
      by_priority: {} as Record<PermitPriority, number>,
      estimated_total_value: 0,
      actual_total_value: 0,
    };

    const now = new Date();

    permits.forEach(permit => {
      // Count by status
      switch (permit.status) {
        case PermitStatus.DRAFT:
          stats.draft++;
          break;
        case PermitStatus.SUBMITTED:
          stats.submitted++;
          break;
        case PermitStatus.UNDER_REVIEW:
          stats.under_review++;
          break;
        case PermitStatus.APPROVED:
          stats.approved++;
          break;
        case PermitStatus.ISSUED:
          stats.issued++;
          break;
        case PermitStatus.IN_PROGRESS:
          stats.in_progress++;
          break;
        case PermitStatus.INSPECTION_REQUIRED:
          stats.inspection_required++;
          break;
        case PermitStatus.COMPLETED:
          stats.completed++;
          break;
        case PermitStatus.REJECTED:
          stats.rejected++;
          break;
        case PermitStatus.CANCELLED:
          stats.cancelled++;
          break;
        case PermitStatus.EXPIRED:
          stats.expired++;
          break;
      }

      // Count overdue permits
      if (permit.is_overdue) {
        stats.overdue++;
      }

      // Count permits with violations
      if (permit.has_violations) {
        stats.with_violations++;
      }

      // Count by type
      stats.by_type[permit.permit_type] = (stats.by_type[permit.permit_type] || 0) + 1;

      // Count by priority
      stats.by_priority[permit.priority] = (stats.by_priority[permit.priority] || 0) + 1;

      // Sum values
      if (permit.project_details?.estimated_cost) {
        stats.estimated_total_value += permit.project_details.estimated_cost;
      }

      if (permit.fees?.total_fee) {
        stats.actual_total_value += permit.fees.total_fee;
      }
    });

    return stats;
  }

  private async generatePermitNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HP${year}`;

    // Find the highest existing permit number for this year and tenant
    const latestPermit = await this.permitsRepository
      .createQueryBuilder('permit')
      .leftJoin('permit.household', 'household')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('permit.permit_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('permit.permit_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (latestPermit) {
      const currentSequence = parseInt(latestPermit.permit_number.replace(prefix, ''));
      if (!isNaN(currentSequence)) {
        sequence = currentSequence + 1;
      }
    }

    return `${prefix}${sequence.toString().padStart(5, '0')}`;
  }
}