import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ElectionsRepository } from './elections.repository';
import {
  ElectionEntity,
  ElectionType,
  ElectionStatus,
  VoteType,
  EligibilityType,
} from './entities/election.entity';
import { CreateElectionDto, UpdateElectionDto, SearchElectionsDto } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ElectionsService {
  constructor(
    private readonly electionsRepository: ElectionsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async create(createElectionDto: CreateElectionDto): Promise<ElectionEntity> {
    const election = await this.electionsRepository.create(createElectionDto);

    // Log election creation
    await this.auditService.log({
      action: 'create',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: createElectionDto.created_by,
      details: {
        title: election.title,
        type: election.type,
        vote_type: election.vote_type,
      },
    });

    // Send notifications if required
    if (election.status === ElectionStatus.SCHEDULED) {
      await this.sendElectionNotifications(election, 'election_scheduled');
    }

    return election;
  }

  async findAll(options: SearchElectionsDto = {}, tenantId?: string): Promise<{
    elections: ElectionEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.electionsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<ElectionEntity> {
    return await this.electionsRepository.findOne(id);
  }

  async update(id: string, updateElectionDto: UpdateElectionDto): Promise<ElectionEntity> {
    const election = await this.electionsRepository.update(id, updateElectionDto);

    await this.auditService.log({
      action: 'update',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: updateElectionDto.updated_by,
      details: updateElectionDto,
    });

    return election;
  }

  // Election lifecycle management
  async scheduleElection(id: string, scheduledBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    if (election.status !== ElectionStatus.DRAFT) {
      throw new Error('Election must be in draft status to schedule');
    }

    const updatedElection = await this.electionsRepository.update(id, {
      status: ElectionStatus.SCHEDULED,
      updated_by: scheduledBy,
    });

    await this.auditService.log({
      action: 'schedule_election',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: scheduledBy,
    });

    await this.sendElectionNotifications(updatedElection, 'election_scheduled');

    return updatedElection;
  }

  async startNominationPhase(id: string, startedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.startNominationPhase();

    const updatedElection = await this.electionsRepository.update(id, {
      status: ElectionStatus.NOMINATION_PHASE,
      updated_by: startedBy,
    });

    await this.auditService.log({
      action: 'start_nomination_phase',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: startedBy,
    });

    await this.sendElectionNotifications(updatedElection, 'nomination_phase_started');

    return updatedElection;
  }

  async startCampaignPeriod(id: string, startedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.startCampaignPeriod();

    const updatedElection = await this.electionsRepository.update(id, {
      status: ElectionStatus.CAMPAIGN_PERIOD,
      updated_by: startedBy,
    });

    await this.auditService.log({
      action: 'start_campaign_period',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: startedBy,
    });

    await this.sendElectionNotifications(updatedElection, 'campaign_period_started');

    return updatedElection;
  }

  async startVotingPeriod(id: string, startedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.startVotingPeriod();

    const updatedElection = await this.electionsRepository.update(id, {
      status: ElectionStatus.VOTING_PERIOD,
      updated_by: startedBy,
    });

    await this.auditService.log({
      action: 'start_voting_period',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: startedBy,
    });

    await this.sendElectionNotifications(updatedElection, 'voting_period_started');

    return updatedElection;
  }

  async endVotingPeriod(id: string, endedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.endVotingPeriod();

    const updatedElection = await this.electionsRepository.update(id, {
      status: ElectionStatus.VOTING_ENDED,
      updated_by: endedBy,
    });

    await this.auditService.log({
      action: 'end_voting_period',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: endedBy,
    });

    return updatedElection;
  }

  // Candidate management
  async nominateCandidate(id: string, nominationData: {
    user_id: string;
    position_id: string;
    statement?: string;
    qualifications?: string[];
    experience?: string;
    nominator_id?: string;
  }): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    if (!election.can_accept_nominations) {
      throw new Error('Nomination period is not open for this election');
    }

    const user = await this.usersService.findOne(nominationData.user_id);

    const candidateData = {
      position_id: nominationData.position_id,
      user_id: nominationData.user_id,
      user_name: user.display_name,
      user_email: user.email,
      statement: nominationData.statement,
      qualifications: nominationData.qualifications,
      experience: nominationData.experience,
      is_write_in: false,
    };

    const updatedElection = await this.electionsRepository.addCandidate(id, candidateData, nominationData.nominator_id || nominationData.user_id);

    await this.auditService.log({
      action: 'nominate_candidate',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: nominationData.nominator_id || nominationData.user_id,
      details: {
        candidate_id: nominationData.user_id,
        position_id: nominationData.position_id,
      },
    });

    return updatedElection;
  }

  async approveCandidate(id: string, candidateId: string, approvedBy: string): Promise<ElectionEntity> {
    const election = await this.electionsRepository.approveCandidate(id, candidateId, approvedBy);

    await this.auditService.log({
      action: 'approve_candidate',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: approvedBy,
      details: { candidate_id: candidateId },
    });

    return election;
  }

  async rejectCandidate(id: string, candidateId: string, reason: string, rejectedBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.rejectCandidate(candidateId, reason, rejectedBy);

    const updatedElection = await this.electionsRepository.update(id, {
      candidates: election.candidates,
      updated_by: rejectedBy,
    });

    await this.auditService.log({
      action: 'reject_candidate',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: rejectedBy,
      details: { candidate_id: candidateId, reason },
    });

    return updatedElection;
  }

  async withdrawCandidate(id: string, candidateId: string, reason: string, withdrawnBy: string): Promise<ElectionEntity> {
    const election = await this.findOne(id);
    election.withdrawCandidate(candidateId, reason, withdrawnBy);

    const updatedElection = await this.electionsRepository.update(id, {
      candidates: election.candidates,
      updated_by: withdrawnBy,
    });

    await this.auditService.log({
      action: 'withdraw_candidate',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: withdrawnBy,
      details: { candidate_id: candidateId, reason },
    });

    return updatedElection;
  }

  // Voting methods
  async castVote(id: string, voteData: {
    user_id: string;
    votes: Array<{
      position_id?: string;
      candidate_ids?: string[];
      ballot_option_id?: string;
    }>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<ElectionEntity> {
    const election = await this.findOne(id);

    if (!election.is_voting_open) {
      throw new Error('Voting is not open for this election');
    }

    // Validate user eligibility
    const user = await this.usersService.findOne(voteData.user_id);
    if (!this.isUserEligible(election, user)) {
      throw new Error('User is not eligible to vote in this election');
    }

    // Record vote
    const updatedElection = await this.electionsRepository.recordVote(id, voteData);

    await this.auditService.log({
      action: 'cast_vote',
      entity_type: 'election',
      entity_id: election.id,
      tenant_id: election.tenant_id,
      user_id: voteData.user_id,
      details: {
        vote_count: voteData.votes.length,
      },
    });

    return updatedElection;
  }

  // Query methods
  async getActiveElections(tenantId: string): Promise<ElectionEntity[]> {
    return await this.electionsRepository.getActiveElections(tenantId);
  }

  async getElectionsInNominationPhase(tenantId: string): Promise<ElectionEntity[]> {
    return await this.electionsRepository.getElectionsInNominationPhase(tenantId);
  }

  async getElectionsInVotingPeriod(tenantId: string): Promise<ElectionEntity[]> {
    return await this.electionsRepository.getElectionsInVotingPeriod(tenantId);
  }

  async getStatistics(tenantId?: string): Promise<any> {
    return await this.electionsRepository.getStatistics(tenantId);
  }

  // Template methods
  async createBoardElection(data: {
    title: string;
    description: string;
    tenant_id: string;
    created_by: string;
    positions: Array<{
      title: string;
      description: string;
      term_length_months: number;
      max_winners: number;
    }>;
    voting_schedule: {
      nomination_start_date: Date;
      nomination_end_date: Date;
      voting_start_date: Date;
      voting_end_date: Date;
    };
  }): Promise<ElectionEntity> {
    const electionData = ElectionEntity.createBoardElection(data);
    return await this.create(electionData);
  }

  async createBudgetApproval(data: {
    title: string;
    description: string;
    tenant_id: string;
    created_by: string;
    budget_details: any;
    voting_schedule: {
      voting_start_date: Date;
      voting_end_date: Date;
    };
  }): Promise<ElectionEntity> {
    const electionData = ElectionEntity.createBudgetApproval(data);
    return await this.create(electionData);
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledTransitions(): Promise<void> {
    try {
      const now = new Date();

      // Process election transitions that should happen automatically
      // This would include starting nomination phases, campaign periods, voting periods, etc.
      // Implementation would depend on specific business rules

    } catch (error) {
      console.error('Error processing scheduled election transitions:', error);
    }
  }

  // Helper methods
  private async sendElectionNotifications(election: ElectionEntity, action: string): Promise<void> {
    try {
      const tenantId = election.tenant_id;

      // Determine recipients based on election type and action
      let recipients = [];

      switch (action) {
        case 'election_scheduled':
        case 'nomination_phase_started':
        case 'voting_period_started':
          // Send to all eligible voters
          recipients = await this.getEligibleVoters(election);
          break;
        default:
          break;
      }

      for (const recipient of recipients) {
        await this.notificationsService.sendNotification({
          type: action as any,
          title: this.getNotificationTitle(action, election),
          message: this.getNotificationMessage(action, election),
          recipient_id: recipient.id,
          data: {
            election_id: election.id,
            election_title: election.title,
            election_type: election.type,
          },
        });
      }

    } catch (error) {
      console.error(`Failed to send ${action} notifications for election ${election.id}:`, error);
    }
  }

  private async getEligibleVoters(election: ElectionEntity): Promise<any[]> {
    // This would implement the logic to determine who is eligible to vote
    // based on election.eligibility_type and election.eligibility_criteria
    return [];
  }

  private isUserEligible(election: ElectionEntity, user: any): boolean {
    // Implement eligibility checking logic
    switch (election.eligibility_type) {
      case EligibilityType.ALL_RESIDENTS:
        return true;
      case EligibilityType.PROPERTY_OWNERS_ONLY:
        return user.roles.includes('property_owner');
      case EligibilityType.BOARD_MEMBERS:
        return user.roles.includes('board_member');
      default:
        return true; // Default to eligible
    }
  }

  private getNotificationTitle(action: string, election: ElectionEntity): string {
    const titles = {
      election_scheduled: 'Election Scheduled',
      nomination_phase_started: 'Nomination Period Started',
      campaign_period_started: 'Campaign Period Started',
      voting_period_started: 'Voting Period Started',
      voting_period_ending: 'Voting Period Ending Soon',
      election_completed: 'Election Results Available',
    };

    return titles[action] || 'Election Update';
  }

  private getNotificationMessage(action: string, election: ElectionEntity): string {
    const messages = {
      election_scheduled: `A new election "${election.title}" has been scheduled.`,
      nomination_phase_started: `The nomination period for "${election.title}" has started.`,
      campaign_period_started: `The campaign period for "${election.title}" has begun.`,
      voting_period_started: `Voting is now open for "${election.title}".`,
      voting_period_ending: `Voting for "${election.title}" ends soon. Please cast your vote.`,
      election_completed: `Results are now available for "${election.title}".`,
    };

    return messages[action] || `Update regarding election "${election.title}".`;
  }
}