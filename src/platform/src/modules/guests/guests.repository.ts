import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, Not, LessThan, MoreThan, Between } from 'typeorm';
import { GuestEntity, GuestStatus } from './entities/guest.entity';
import { CreateGuestDto, UpdateGuestDto, SearchGuestsDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError } from '@hoa-platform/shared';
import { HouseholdsRepository } from '../households/households.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class GuestsRepository {
  constructor(
    @InjectRepository(GuestEntity)
    private readonly guestsRepository: Repository<GuestEntity>,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<GuestEntity> {
    // Validate household exists
    const household = await this.householdsRepository.findOne(createGuestDto.household_id);
    if (!household) {
      throw new NotFoundError('Household', createGuestDto.household_id);
    }

    // Validate dates
    if (createGuestDto.expected_arrival && createGuestDto.expected_departure) {
      if (new Date(createGuestDto.expected_arrival) >= new Date(createGuestDto.expected_departure)) {
        throw new ValidationError('Expected departure must be after expected arrival');
      }
    }

    // Check for blacklisted guests
    if (createGuestDto.email || createGuestDto.phone) {
      const blacklistedGuest = await this.findBlacklistedGuest(
        createGuestDto.email,
        createGuestDto.phone,
        createGuestDto.first_name,
        createGuestDto.last_name,
      );

      if (blacklistedGuest) {
        throw new ConflictError('Guest is blacklisted', {
          reason: blacklistedGuest.blacklist_reason,
        });
      }
    }

    const guest = this.guestsRepository.create(createGuestDto);

    // Generate access code if needed
    if (guest.requires_gate_pass && !guest.access_code) {
      guest.access_code = this.generateAccessCode();
    }

    return await this.guestsRepository.save(guest);
  }

  async findAll(options: SearchGuestsDto = {}, tenantId?: string): Promise<{
    guests: GuestEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, status, household_id, is_active, requires_escort } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .leftJoinAndSelect('guest.approver', 'approver')
      .leftJoinAndSelect('guest.last_updated_by_user', 'lastUpdatedByUser')
      .leftJoinAndSelect('guest.access_logs', 'accessLogs')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(guest.first_name ILIKE :search OR guest.last_name ILIKE :search OR guest.email ILIKE :search OR guest.phone ILIKE :search OR guest.company ILIKE :search OR guest.purpose ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('guest.status = :status', { status });
    }

    if (household_id) {
      queryBuilder.andWhere('guest.household_id = :householdId', { householdId });
    }

    if (typeof is_active === 'boolean') {
      const now = new Date();
      if (is_active) {
        queryBuilder.andWhere(
          '(guest.status = :approved AND guest.expected_arrival <= :now AND (guest.expected_departure >= :now OR guest.expected_departure IS NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      } else {
        queryBuilder.andWhere(
          '(guest.status != :approved OR guest.expected_arrival > :now OR (guest.expected_departure < :now AND guest.expected_departure IS NOT NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      }
    }

    if (typeof requires_escort === 'boolean') {
      queryBuilder.andWhere('guest.requires_escort = :requiresEscort', { requiresEscort });
    }

    const [guests, total] = await queryBuilder
      .orderBy('guest.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      guests,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.findOne({
      where: { id },
      relations: ['household', 'approver', 'last_updated_by_user', 'access_logs', 'gate_passes'],
    });

    if (!guest) {
      throw new NotFoundError('Guest', id);
    }

    return guest;
  }

  async findByEmail(email: string): Promise<GuestEntity | null> {
    return await this.guestsRepository.findOne({
      where: { email },
      relations: ['household'],
    });
  }

  async findByPhone(phone: string): Promise<GuestEntity | null> {
    return await this.guestsRepository.findOne({
      where: { phone },
      relations: ['household'],
    });
  }

  async findByHousehold(householdId: string, options: SearchGuestsDto = {}): Promise<{
    guests: GuestEntity[];
    total: number;
  }> {
    const { status, is_active } = options;

    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .where('guest.household_id = :householdId', { householdId });

    if (status) {
      queryBuilder.andWhere('guest.status = :status', { status });
    }

    if (typeof is_active === 'boolean') {
      const now = new Date();
      if (is_active) {
        queryBuilder.andWhere(
          '(guest.status = :approved AND guest.expected_arrival <= :now AND (guest.expected_departure >= :now OR guest.expected_departure IS NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      } else {
        queryBuilder.andWhere(
          '(guest.status != :approved OR guest.expected_arrival > :now OR (guest.expected_departure < :now AND guest.expected_departure IS NOT NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      }
    }

    const [guests, total] = await queryBuilder
      .orderBy('guest.expected_arrival', 'ASC')
      .getManyAndCount();

    return { guests, total };
  }

  async findByTenant(tenantId: string, options: SearchGuestsDto = {}): Promise<{
    guests: GuestEntity[];
    total: number;
  }> {
    const { search, status, is_active, requires_escort } = options;

    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .leftJoinAndSelect('guest.approver', 'approver')
      .where('household.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(guest.first_name ILIKE :search OR guest.last_name ILIKE :search OR guest.email ILIKE :search OR guest.phone ILIKE :search OR guest.company ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('guest.status = :status', { status });
    }

    if (typeof is_active === 'boolean') {
      const now = new Date();
      if (is_active) {
        queryBuilder.andWhere(
          '(guest.status = :approved AND guest.expected_arrival <= :now AND (guest.expected_departure >= :now OR guest.expected_departure IS NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      } else {
        queryBuilder.andWhere(
          '(guest.status != :approved OR guest.expected_arrival > :now OR (guest.expected_departure < :now AND guest.expected_departure IS NOT NULL))',
          { approved: GuestStatus.APPROVED, now },
        );
      }
    }

    if (typeof requires_escort === 'boolean') {
      queryBuilder.andWhere('guest.requires_escort = :requiresEscort', { requiresEscort });
    }

    const [guests, total] = await queryBuilder
      .orderBy('guest.expected_arrival', 'ASC')
      .getManyAndCount();

    return { guests, total };
  }

  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    // Validate dates if being updated
    if (updateGuestDto.expected_arrival && updateGuestDto.expected_departure) {
      if (new Date(updateGuestDto.expected_arrival) >= new Date(updateGuestDto.expected_departure)) {
        throw new ValidationError('Expected departure must be after expected arrival');
      }
    }

    Object.assign(guest, updateGuestDto);

    // Regenerate access code if needed
    if (updateGuestDto.requires_gate_pass && !guest.access_code) {
      guest.access_code = this.generateAccessCode();
    }

    return await this.guestsRepository.save(guest);
  }

  async remove(id: string): Promise<void> {
    const guest = await this.findOne(id);
    await this.guestsRepository.remove(guest);
  }

  async approve(id: string, approvedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (guest.is_approved) {
      throw new ConflictError('Guest is already approved');
    }

    guest.status = GuestStatus.APPROVED;
    guest.approved_by = approvedBy;
    guest.approved_at = new Date();

    return await this.guestsRepository.save(guest);
  }

  async reject(id: string, reason: string, rejectedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (guest.is_rejected()) {
      throw new ConflictError('Guest is already rejected');
    }

    guest.status = GuestStatus.REJECTED;
    guest.rejection_reason = reason;
    guest.approved_by = rejectedBy;
    guest.approved_at = new Date();

    return await this.guestsRepository.save(guest);
  }

  async checkIn(id: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (!guest.is_approved) {
      throw new ValidationError('Guest must be approved before check-in');
    }

    if (guest.is_checked_in) {
      throw new ConflictError('Guest is already checked in');
    }

    guest.status = GuestStatus.CHECKED_IN;
    guest.checked_in_at = new Date();
    guest.visit_count = (guest.visit_count || 0) + 1;

    return await this.guestsRepository.save(guest);
  }

  async checkOut(id: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (!guest.is_checked_in) {
      throw new ValidationError('Guest is not checked in');
    }

    guest.status = GuestStatus.APPROVED; // Return to approved state
    guest.checked_out_at = new Date();

    return await this.guestsRepository.save(guest);
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (guest.is_blacklisted) {
      throw new ConflictError('Guest is already blacklisted');
    }

    guest.is_blacklisted = true;
    guest.blacklist_reason = reason;
    guest.last_updated_by = blacklistedBy;

    return await this.guestsRepository.save(guest);
  }

  async removeFromBlacklist(id: string, removedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (!guest.is_blacklisted) {
      throw new ConflictError('Guest is not blacklisted');
    }

    guest.is_blacklisted = false;
    guest.blacklist_reason = null;
    guest.last_updated_by = removedBy;

    return await this.guestsRepository.save(guest);
  }

  async getPendingApprovals(tenantId: string): Promise<GuestEntity[]> {
    return await this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('guest.status = :status', { status: GuestStatus.PENDING })
      .orderBy('guest.created_at', 'ASC')
      .getMany();
  }

  async getActiveGuests(tenantId: string): Promise<GuestEntity[]> {
    const now = new Date();

    return await this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .leftJoinAndSelect('guest.approver', 'approver')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('guest.status = :status', { status: GuestStatus.APPROVED })
      .andWhere('guest.expected_arrival <= :now', { now })
      .andWhere('(guest.expected_departure >= :now OR guest.expected_departure IS NULL)', { now })
      .orderBy('guest.expected_arrival', 'ASC')
      .getMany();
  }

  async getOverstayingGuests(tenantId: string): Promise<GuestEntity[]> {
    const now = new Date();

    return await this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .where('household.tenant_id = :tenantId', { tenantId })
      .andWhere('guest.status = :status', { status: GuestStatus.APPROVED })
      .andWhere('guest.expected_departure < :now', { now })
      .andWhere('guest.checked_out_at IS NULL', {})
      .orderBy('guest.expected_departure', 'ASC')
      .getMany();
  }

  async getExpectedArrivals(date: Date, tenantId?: string): Promise<GuestEntity[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoinAndSelect('guest.household', 'household')
      .where('guest.expected_arrival BETWEEN :start AND :end', { start: startOfDay, end: endOfDay })
      .andWhere('guest.status IN (:...statuses)', { statuses: [GuestStatus.APPROVED, GuestStatus.PENDING] });

    if (tenantId) {
      queryBuilder.andWhere('household.tenant_id = :tenantId', { tenantId });
    }

    return await queryBuilder
      .orderBy('guest.expected_arrival', 'ASC')
      .getMany();
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    checked_in: number;
    blacklisted: number;
    expected_today: number;
    overstaying: number;
    with_vehicles: number;
    recurring: number;
  }> {
    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .leftJoin('guest.household', 'household');

    if (tenantId) {
      queryBuilder.where('household.tenant_id = :tenantId', { tenantId });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      total,
      pending,
      approved,
      rejected,
      checkedIn,
      blacklisted,
      expectedToday,
      overstaying,
      withVehicles,
      recurring,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().where('guest.status = :status', { status: GuestStatus.PENDING }).getCount(),
      queryBuilder.clone().where('guest.status = :status', { status: GuestStatus.APPROVED }).getCount(),
      queryBuilder.clone().where('guest.status = :status', { status: GuestStatus.REJECTED }).getCount(),
      queryBuilder.clone().where('guest.status = :status', { status: GuestStatus.CHECKED_IN }).getCount(),
      queryBuilder.clone().where('guest.is_blacklisted = :blacklisted', { blacklisted: true }).getCount(),
      queryBuilder.clone()
        .where('guest.expected_arrival >= :today', { today })
        .andWhere('guest.expected_arrival < :tomorrow', { tomorrow })
        .andWhere('guest.status IN (:...statuses)', { statuses: [GuestStatus.APPROVED, GuestStatus.PENDING] })
        .getCount(),
      queryBuilder.clone()
        .where('guest.expected_departure < :now', { now })
        .andWhere('guest.status = :status', { status: GuestStatus.APPROVED })
        .andWhere('guest.checked_out_at IS NULL', {})
        .getCount(),
      queryBuilder.clone()
        .where('(guest.vehicle_make IS NOT NULL OR guest.vehicle_model IS NOT NULL OR guest.license_plate IS NOT NULL)')
        .getCount(),
      queryBuilder.clone().where('guest.is_recurring = :recurring', { recurring: true }).getCount(),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      checked_in: checkedIn,
      blacklisted,
      expected_today: expectedToday,
      overstaying: overstaying,
      with_vehicles: withVehicles,
      recurring,
    };
  }

  private async findBlacklistedGuest(
    email?: string,
    phone?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<GuestEntity | null> {
    const queryBuilder = this.guestsRepository
      .createQueryBuilder('guest')
      .where('guest.is_blacklisted = :blacklisted', { blacklisted: true });

    const conditions = [];
    const parameters: any = {};

    if (email) {
      conditions.push('guest.email = :email');
      parameters.email = email;
    }

    if (phone) {
      conditions.push('guest.phone = :phone');
      parameters.phone = phone;
    }

    if (firstName && lastName) {
      conditions.push('(guest.first_name = :firstName AND guest.last_name = :lastName)');
      parameters.firstName = firstName;
      parameters.lastName = lastName;
    }

    if (conditions.length > 0) {
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`, parameters);
    } else {
      return null;
    }

    return await queryBuilder.getOne();
  }

  private generateAccessCode(): string {
    // Generate a 6-digit access code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}