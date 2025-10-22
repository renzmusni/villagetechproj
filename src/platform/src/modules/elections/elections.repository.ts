import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not, Between } from 'typeorm';
import {
  ElectionEntity,
  ElectionType,
  ElectionStatus,
  VoteType,
  EligibilityType,
  QuorumType,
} from './entities/election.entity';
import { CreateElectionDto, UpdateElectionDto, SearchElectionsDto } from '@hoa-platform/shared';
import { NotFoundError, ValidationError } from '@hoa-platform/shared';
import { UsersRepository } from '../users/users.repository';
import { HouseholdsRepository } from '../households/households.repository';

@Injectable()
export class ElectionsRepository {
  constructor(
    @InjectRepository(ElectionEntity)
    private readonly electionsRepository: Repository<ElectionEntity>,
    private readonly usersRepository: UsersRepository,
    private readonly householdsRepository: HouseholdsRepository,
  ) {}

  async create(createElectionDto: Partial<ElectionEntity>): Promise<ElectionEntity> {
    // Validate creator exists
    if (createElectionDto.created_by) {
      const creator = await this.usersRepository.findOne(createElectionDto.created_by);
      if (!creator) {
        throw new NotFoundError('User', createElectionDto.created_by);
      }
    }

    // Validate dates
    if (createElectionDto.voting_schedule) {
      const schedule = createElectionDto.voting_schedule;

      if (schedule.nomination_start_date && schedule.nomination_end_date) {
        if (new Date(schedule.nomination_start_date) >= new Date(schedule.nomination_end_date)) {
          throw new ValidationError('Nomination end date must be after start date');
        }
      }

      if (schedule.voting_start_date && schedule.voting_end_date) {
        if (new Date(schedule.voting_start_date) >= new Date(schedule.voting_end_date)) {
          throw new ValidationError('Voting end date must be after start date');
        }
      }

      if (schedule.nomination_end_date && schedule.voting_start_date) {
        if (new Date(schedule.nomination_end_date) >= new Date(schedule.voting_start_date)) {
          throw new ValidationError('Voting start date must be after nomination end date');
        }
      }
    }

    // Validate positions for candidate-based elections
    if (createElectionDto.type !== ElectionType.BUDGET_APPROVAL &&
        createElectionDto.type !== ElectionType.REFERENDUM &&
        createElectionDto.type !== ElectionType.POLICY_CHANGES) {
      if (!createElectionDto.positions || createElectionDto.positions.length === 0) {
        throw new ValidationError('At least one position must be specified for this election type');
      }
    }

    const election = this.electionsRepository.create(createElectionDto);

    // Initialize audit log
    election.addAuditEntry({
      action: 'election_created',
      user_id: createElectionDto.created_by || '',
      user_name: 'System', // Will be populated
      details: {
        title: election.title,
        type: election.type,
        vote_type: election.vote_type,
      },
    });

    return await this.electionsRepository.save(election);
  }

  async findAll(options: SearchElectionsDto = {}, tenantId?: string): Promise<{
    elections: ElectionEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      vote_type,
      eligibility_type,
      created_by,
      is_active,
      is_voting_open,
      is_nomination_open,
      start_date_from,
      start_date_to,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.electionsRepository
      .createQueryBuilder('election')
      .leftJoinAndSelect('election.creator', 'creator')
      .leftJoinAndSelect('election.supervisor', 'supervisor')
      .leftJoinAndSelect('election.approver', 'approver')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('election.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(election.title ILIKE :search OR election.description ILIKE :search OR election.summary ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('election.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('election.status = :status', { status });
    }

    if (vote_type) {
      queryBuilder.andWhere('election.vote_type = :voteType', { voteType: vote_type });
    }

    if (eligibility_type) {
      queryBuilder.andWhere('election.eligibility_type = :eligibilityType', { eligibilityType });
    }

    if (created_by) {
      queryBuilder.andWhere('election.created_by = :createdBy', { createdBy: created_by });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere('election.status IN (:...activeStatuses)', {
          activeStatuses: [
            ElectionStatus.SCHEDULED,
            ElectionStatus.NOMINATION_PHASE,
            ElectionStatus.CAMPAIGN_PERIOD,
            ElectionStatus.VOTING_PERIOD,
          ],
        });
      } else {
        queryBuilder.andWhere('election.status NOT IN (:...activeStatuses)', {
          activeStatuses: [
            ElectionStatus.SCHEDULED,
            ElectionStatus.NOMINATION_PHASE,
            ElectionStatus.CAMPAIGN_PERIOD,
            ElectionStatus.VOTING_PERIOD,
          ],
        });
      }
    }

    if (typeof is_voting_open === 'boolean') {
      const now = new Date();
      if (is_voting_open) {
        queryBuilder.andWhere(
          '(election.status = :votingPeriod AND election.voting_schedule->>\'voting_start_date\' <= :now AND election.voting_schedule->>\'voting_end_date\' >= :now)',
          {
            votingPeriod: ElectionStatus.VOTING_PERIOD,
            now: now.toISOString(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(election.status != :votingPeriod OR election.voting_schedule->>\'voting_start_date\' > :now OR election.voting_schedule->>\'voting_end_date\' < :now)',
          {
            votingPeriod: ElectionStatus.VOTING_PERIOD,
            now: now.toISOString(),
          },
        );
      }
    }

    if (typeof is_nomination_open === 'boolean') {
      const now = new Date();
      if (is_nomination_open) {
        queryBuilder.andWhere(
          '(election.status = :nominationPhase AND election.voting_schedule->>\'nomination_start_date\' <= :now AND election.voting_schedule->>\'nomination_end_date\' >= :now)',
          {
            nominationPhase: ElectionStatus.NOMINATION_PHASE,
            now: now.toISOString(),
          },
        );
      } else {
        queryBuilder.andWhere(
          '(election.status != :nominationPhase OR election.voting_schedule->>\'nomination_start_date\' > :now OR election.voting_schedule->>\'nomination_end_date\' < :now)',
          {
            nominationPhase: ElectionStatus.NOMINATION_PHASE,
            now: now.toISOString(),
          },
        );
      }
    }

    if (start_date_from) {
      queryBuilder.andWhere('election.created_at >= :startDateFrom', { startDateFrom: new Date(start_date_from) });
    }

    if (start_date_to) {
      queryBuilder.andWhere('election.created_at <= :startDateTo', { startDateTo: new Date(start_date_to) });
    }

    const [elections, total] = await queryBuilder
      .orderBy('election.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      elections,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<ElectionEntity> {
    const election = await this.electionsRepository.findOne({
      where: { id },
      relations: ['creator', 'supervisor', 'approver'],
    });

    if (!election) {
      throw new NotFoundError('Election', id);
    }

    return election;
  }

  async findByTenant(tenantId: string, options: SearchElectionsDto = {}): Promise<{
    elections: ElectionEntity[];
    total: number;
  }> {
    const { status, type, is_active } = options;

    const queryBuilder = this.electionsRepository
      .createQueryBuilder('election')
      .leftJoinAndSelect('election.creator', 'creator')
      .where('election.tenant_id = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('election.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('election.type = :type', { type });
    }

    if (typeof is_active === 'boolean') {
      if (is_active) {
        queryBuilder.andWhere('election.status IN (:...activeStatuses)', {
          activeStatuses: [
            ElectionStatus.SCHEDULED,
            ElectionStatus.NOMINATION_PHASE,
            ElectionStatus.CAMPAIGN_PERIOD,
            ElectionStatus.VOTING_PERIOD,
          ],
        });
      } else {
        queryBuilder.andWhere('election.status NOT IN (:...activeStatuses)', {
          activeStatuses: [
            ElectionStatus.SCHEDULED,
            ElectionStatus.NOMINATION_PHASE,
            ElectionStatus.CAMPAIGN_PERIOD,
            ElectionStatus.VOTING_PERIOD,
          ],
        });
      }
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [elections, total] = await queryBuilder
      .orderBy('election.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { elections, total };
  }

  async getActiveElections(tenantId: string): Promise<ElectionEntity[]> {
    return await this.electionsRepository
      .createQueryBuilder('election')
      .leftJoinAndSelect('election.creator', 'creator')
      .where('election.tenant_id = :tenantId', { tenantId })
      .andWhere('election.status IN (:...activeStatuses)', {
        activeStatuses: [
          ElectionStatus.SCHEDULED,
          ElectionStatus.NOMINATION_PHASE,
          ElectionStatus.CAMPAIGN_PERIOD,
          ElectionStatus.VOTING_PERIOD,
        ],
      })
      .orderBy('election.created_at', 'DESC')
      .getMany();
  }

  async getElectionsInNominationPhase(tenantId: string): Promise<ElectionEntity[]> {
    const now = new Date();

    return await this.electionsRepository
      .createQueryBuilder('election')
      .leftJoinAndSelect('election.creator', 'creator')
      .where('election.tenant_id = :tenantId', { tenantId })
      .andWhere('election.status = :nominationPhase', { nominationPhase: ElectionStatus.NOMINATION_PHASE })
      .andWhere('election.voting_schedule->>\'nomination_start_date\' <= :now', { now: now.toISOString() })
      .andWhere('election.voting_schedule->>\'nomination_end_date\' >= :now', { now: now.toISOString() })
      .orderBy('election.created_at', 'DESC')
      .getMany();
  }

  async getElectionsInVotingPeriod(tenantId: string): Promise<ElectionEntity[]> {
    const now = new Date();

    return await this.electionsRepository
      .createQueryBuilder('election')
      .leftJoinAndSelect('election.creator', 'creator')
      .where('election.tenant_id = :tenantId', { tenantId })
      .andWhere('election.status = :votingPeriod', { votingPeriod: ElectionStatus.VOTING_PERIOD })
      .andWhere('election.voting_schedule->>\'voting_start_date\' <= :now', { now: now.toISOString() })
      .andWhere('election.voting_schedule->>\'voting_end_date\' >= :now', { now: now.toISOString() })
      .orderBy('election.created_at', 'DESC')
      .getMany();
  }

  async update(id: string, updateElectionDto: UpdateElectionDto): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    // Validate dates if being updated
    if (updateElectionDto.voting_schedule) {
      const schedule = updateElectionDto.voting_schedule;

      if (schedule.nomination_start_date && schedule.nomination_end_date) {
        if (new Date(schedule.nomination_start_date) >= new Date(schedule.nomination_end_date)) {
          throw new ValidationError('Nomination end date must be after start date');
        }
      }

      if (schedule.voting_start_date && schedule.voting_end_date) {
        if (new Date(schedule.voting_start_date) >= new Date(schedule.voting_end_date)) {
          throw new ValidationError('Voting end date must be after start date');
        }
      }
    }

    Object.assign(election, updateElectionDto);

    // Add audit entry
    election.addAuditEntry({
      action: 'election_updated',
      user_id: updateElectionDto.updated_by || '',
      user_name: 'System',
      details: updateElectionDto,
    });

    return await this.electionsRepository.save(election);
  }

  async addCandidate(id: string, candidateData: {
    position_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    statement?: string;
    photo?: string;
    qualifications?: string[];
    experience?: string;
    is_write_in?: boolean;
  }, addedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    election.addCandidate(candidateData);

    // Add audit entry
    election.addAuditEntry({
      action: 'candidate_added',
      user_id: addedBy,
      user_name: 'System',
      details: candidateData,
    });

    return await this.electionsRepository.save(election);
  }

  async approveCandidate(id: string, candidateId: string, approvedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    election.approveCandidate(candidateId, approvedBy);

    return await this.electionsRepository.save(election);
  }

  async remove(id: string): Promise<void> {
    const election = await this.findOne(id);
    await this.electionsRepository.remove(election);
  }

  // Statistics
  async getStatistics(tenantId?: string): Promise<{
    total: number;
    by_status: Record<ElectionStatus, number>;
    by_type: Record<ElectionType, number>;
    active: number;
    completed: number;
  }> {
    const queryBuilder = this.electionsRepository
      .createQueryBuilder('election')
      .where('1=1');

    if (tenantId) {
      queryBuilder.andWhere('election.tenant_id = :tenantId', { tenantId });
    }

    const elections = await queryBuilder.getMany();

    const stats = {
      total: elections.length,
      by_status: {} as Record<ElectionStatus, number>,
      by_type: {} as Record<ElectionType, number>,
      active: 0,
      completed: 0,
    };

    elections.forEach(election => {
      stats.by_status[election.status] = (stats.by_status[election.status] || 0) + 1;
      stats.by_type[election.type] = (stats.by_type[election.type] || 0) + 1;

      if (election.is_active) {
        stats.active++;
      }

      if (election.is_completed) {
        stats.completed++;
      }
    });

    return stats;
  }
}