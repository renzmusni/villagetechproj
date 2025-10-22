import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { TenantEntity } from '../../tenants/tenants.entity';
import { UserEntity } from '../../users/users.entity';
import { HouseholdEntity } from '../../households/households.entity';

export enum ElectionType {
  BOARD_MEMBERS = 'board_members',
  COMMITTEE_MEMBERS = 'committee_members',
  OFFICER_ELECTIONS = 'officer_elections',
  BUDGET_APPROVAL = 'budget_approval',
  POLICY_CHANGES = 'policy_changes',
  AMENDMENT_VOTE = 'amendment_vote',
  RECALL_ELECTION = 'recall_election',
  SPECIAL_ELECTION = 'special_election',
  REFERENDUM = 'referendum',
  ASSESSMENT_APPROVAL = 'assessment_approval',
  RULE_CHANGES = 'rule_changes',
  ARCHITECTURAL_CHANGES = 'architectural_changes',
  EXPANSION_APPROVAL = 'expansion_approval',
  OTHER = 'other',
}

export enum ElectionStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  NOMINATION_PHASE = 'nomination_phase',
  CAMPAIGN_PERIOD = 'campaign_period',
  VOTING_PERIOD = 'voting_period',
  VOTING_ENDED = 'voting_ended',
  RESULTS_PENDING = 'results_pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
  UNDER_REVIEW = 'under_review',
}

export enum VoteType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  RANKED_CHOICE = 'ranked_choice',
  APPROVAL_VOTING = 'approval_voting',
  YES_NO_ABSTAIN = 'yes_no_abstain',
  PREFERENCE_VOTING = 'preference_voting',
  WEIGHTED_VOTING = 'weighted_voting',
}

export enum EligibilityType {
  ALL_RESIDENTS = 'all_residents',
  PROPERTY_OWNERS_ONLY = 'property_owners_only',
  REGISTERED_VOTERS = 'registered_voters',
  BOARD_MEMBERS = 'board_members',
  COMMITTEE_MEMBERS = 'committee_members',
  TENANTS_ONLY = 'tenants_only',
  OWNERS_AND_TENANTS = 'owners_and_tenants',
  AGE_REstricted = 'age_restricted',
  OWNERSHIP_DURATION = 'ownership_duration',
  CUSTOM_CRITERIA = 'custom_criteria',
}

export enum QuorumType {
  PERCENTAGE_OF_VOTERS = 'percentage_of_voters',
  PERCENTAGE_OF_MEMBERS = 'percentage_of_members',
  FIXED_NUMBER = 'fixed_number',
  MAJORITY_VOTE = 'majority_vote',
  SUPERMAJORITY_VOTE = 'supermajority_vote',
  UNANIMOUS = 'unanimous',
  NO_QUORUM_REQUIRED = 'no_quorum_required',
}

@Entity('elections')
@Index(['tenant_id', 'status'])
@Index(['status', 'voting_start_date'])
@Index(['type', 'created_at'])
@Index(['voting_start_date', 'voting_end_date'])
export class ElectionEntity extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'enum', enum: ElectionType })
  type: ElectionType;

  @Column({ type: 'enum', enum: ElectionStatus, default: ElectionStatus.DRAFT })
  status: ElectionStatus;

  @Column({ type: 'enum', enum: VoteType })
  vote_type: VoteType;

  @Column({ type: 'enum', enum: EligibilityType })
  eligibility_type: EligibilityType;

  @Column({ type: 'enum', enum: QuorumType })
  quorum_type: QuorumType;

  @Column({ type: 'integer', nullable: true })
  quorum_number: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  quorum_percentage: number;

  @Column({ type: 'integer', nullable: true })
  max_votes_per_voter: number;

  @Column({ type: 'boolean', default: false })
  allow_abstention: boolean;

  @Column({ type: 'boolean', default: false })
  secret_ballot: boolean;

  @Column({ type: 'boolean', default: true })
  anonymous_voting: boolean;

  @Column({ type: 'boolean', default: false })
  require_real_name: boolean;

  @Column({ type: 'jsonb', nullable: true })
  eligibility_criteria: {
    min_age?: number;
    min_ownership_duration_months?: number;
    must_be_in_good_standing?: boolean;
    required_roles?: string[];
    excluded_roles?: string[];
    household_restrictions?: {
      max_voters_per_household?: number;
      owners_only?: boolean;
    };
    custom_criteria?: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  election_settings: {
    allow_nomination?: boolean;
    nomination_start_date?: Date;
    nomination_end_date?: Date;
    require_nomination_second?: boolean;
    max_nominees?: number;
    self_nomination_allowed?: boolean;
    campaign_period_days?: number;
    allow_candidate_statements?: boolean;
    max_statement_length?: number;
    allow_candidate_photos?: boolean;
    allow_endorsements?: boolean;
    max_endorsements?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  voting_schedule: {
    nomination_start_date?: Date;
    nomination_end_date?: Date;
    campaign_start_date?: Date;
    campaign_end_date?: Date;
    voting_start_date?: Date;
    voting_end_date?: Date;
    results_announcement_date?: Date;
    timezone?: string;
    early_voting_allowed?: boolean;
    early_voting_start_date?: Date;
    early_voting_end_date?: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  voting_methods: {
    online_voting?: boolean;
    in_person_voting?: boolean;
    mail_voting?: boolean;
    proxy_voting?: boolean;
    electronic_signature?: boolean;
    two_factor_auth?: boolean;
    ip_restriction?: boolean;
    device_verification?: boolean;
  };

  @Column({ type: 'uuid', nullable: true })
  created_by: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  supervised_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'supervised_by' })
  supervisor: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  positions: Array<{
    id: string;
    title: string;
    description: string;
    department?: string;
    term_length_months?: number;
    max_winners: number;
    min_winners: number;
    write_in_allowed: boolean;
    requirements?: string[];
    salary?: number;
    time_commitment?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  candidates: Array<{
    id: string;
    position_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    statement?: string;
    photo?: string;
    qualifications?: string[];
    experience?: string;
    endorsements?: string[];
    nomination_date?: Date;
    nomination_status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    withdrawal_reason?: string;
    is_write_in: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  ballot_options: Array<{
    id: string;
    position_id?: string;
    text: string;
    description?: string;
    order: number;
    is_write_in_option?: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  voting_results: {
    total_eligible_voters: number;
    total_votes_cast: number;
    total_valid_votes: number;
    total_invalid_votes: number;
    total_abstentions: number;
    quorum_met: boolean;
    voter_turnout_percentage: number;
    position_results?: Array<{
      position_id: string;
      position_title: string;
      total_votes: number;
      winner_details?: Array<{
        candidate_id: string;
        candidate_name: string;
        votes_received: number;
        percentage: number;
        is_winner: boolean;
        is_tie: boolean;
      }>;
      detailed_results?: Array<{
        option_id: string;
        option_text: string;
        votes: number;
        percentage: number;
      }>;
    }>;
    certified_at?: Date;
    certified_by?: string;
    challenged?: boolean;
    challenge_details?: {
      challenger_id: string;
      reason: string;
      evidence?: string[];
      status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
      resolution?: string;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  audit_log: Array<{
    id: string;
    timestamp: Date;
    action: string;
    user_id: string;
    user_name: string;
    details: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  notifications: {
    nomination_reminder_sent?: boolean;
    voting_reminder_sent?: boolean;
    results_announcement_sent?: boolean;
    last_notification_date?: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  legal_requirements: {
    state_compliance?: string[];
    hoa_governance_documents?: string[];
    required_notices?: string[];
    legal_review_required?: boolean;
    legal_review_completed?: boolean;
    attorney_approval?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  documentation: {
    notice_of_election?: string;
    candidate_information?: string;
    voter_guide?: string;
    proxy_form?: string;
    ballot_design?: string;
    results_certification?: string;
    meeting_minutes?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  security_measures: {
    encryption_level?: string;
    audit_trail_enabled?: boolean;
    vote_verification?: boolean;
    integrity_checks?: string[];
    incident_log?: Array<{
      timestamp: Date;
      type: string;
      description: string;
      resolved: boolean;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  accessibility: {
    large_print_ballots?: boolean;
    audio_ballots?: boolean;
    multilingual_support?: string[];
    assistive_technology?: boolean;
    wheelchair_accessible_polling?: boolean;
    remote_voting_options?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  budget: {
    total_cost?: number;
    cost_breakdown?: Array<{
      category: string;
      amount: number;
      description: string;
    }>;
    funding_source?: string;
    approved_budget?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  post_election: {
    transition_plan?: string;
    winner_notification?: string;
    loser_notification?: string;
    results_publication?: string;
    appeal_process?: string;
    record_retention_days?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Virtual properties
  get is_draft(): boolean {
    return this.status === ElectionStatus.DRAFT;
  }

  get is_scheduled(): boolean {
    return this.status === ElectionStatus.SCHEDULED;
  }

  get is_nomination_phase(): boolean {
    return this.status === ElectionStatus.NOMINATION_PHASE;
  }

  get is_campaign_period(): boolean {
    return this.status === ElectionStatus.CAMPAIGN_PERIOD;
  }

  get is_voting_period(): boolean {
    return this.status === ElectionStatus.VOTING_PERIOD;
  }

  get is_voting_ended(): boolean {
    return this.status === ElectionStatus.VOTING_ENDED;
  }

  get is_completed(): boolean {
    return this.status === ElectionStatus.COMPLETED;
  }

  get is_cancelled(): boolean {
    return this.status === ElectionStatus.CANCELLED;
  }

  get is_postponed(): boolean {
    return this.status === ElectionStatus.POSTPONED;
  }

  get is_active(): boolean {
    return [
      ElectionStatus.SCHEDULED,
      ElectionStatus.NOMINATION_PHASE,
      ElectionStatus.CAMPAIGN_PERIOD,
      ElectionStatus.VOTING_PERIOD,
    ].includes(this.status);
  }

  get is_past_nomination_phase(): boolean {
    return ![
      ElectionStatus.DRAFT,
      ElectionStatus.SCHEDULED,
      ElectionStatus.NOMINATION_PHASE,
    ].includes(this.status);
  }

  get can_accept_nominations(): boolean {
    return this.status === ElectionStatus.NOMINATION_PHASE &&
           this.voting_schedule?.nomination_start_date &&
           this.voting_schedule?.nomination_end_date &&
           new Date() >= this.voting_schedule.nomination_start_date &&
           new Date() <= this.voting_schedule.nomination_end_date;
  }

  get is_voting_open(): boolean {
    return this.status === ElectionStatus.VOTING_PERIOD &&
           this.voting_schedule?.voting_start_date &&
           this.voting_schedule?.voting_end_date &&
           new Date() >= this.voting_schedule.voting_start_date &&
           new Date() <= this.voting_schedule.voting_end_date;
  }

  get is_voting_closed(): boolean {
    return this.voting_schedule?.voting_end_date &&
           new Date() > this.voting_schedule.voting_end_date;
  }

  get days_until_voting(): number {
    if (!this.voting_schedule?.voting_start_date) return -1;
    const now = new Date();
    const diff = this.voting_schedule.voting_start_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get days_until_nomination(): number {
    if (!this.voting_schedule?.nomination_start_date) return -1;
    const now = new Date();
    const diff = this.voting_schedule.nomination_start_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get voting_days_remaining(): number {
    if (!this.voting_schedule?.voting_end_date) return 0;
    const now = new Date();
    const diff = this.voting_schedule.voting_end_date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get nomination_days_remaining(): number {
    if (!this.voting_schedule?.nomination_end_date || this.status !== ElectionStatus.NOMINATION_PHASE) return 0;
    const now = new Date();
    const diff = this.voting_schedule.nomination_end_date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get total_candidates(): number {
    return this.candidates?.filter(c => c.nomination_status === 'approved' && !c.is_write_in).length || 0;
  }

  get total_positions(): number {
    return this.positions?.length || 0;
  }

  get has_results(): boolean {
    return !!(this.voting_results && this.voting_results.position_results);
  }

  get voter_turnout(): number {
    if (!this.voting_results?.total_eligible_voters) return 0;
    return (this.voting_results.total_votes_cast / this.voting_results.total_eligible_voters) * 100;
  }

  get quorum_met(): boolean {
    if (!this.voting_results) return false;

    switch (this.quorum_type) {
      case QuorumType.PERCENTAGE_OF_VOTERS:
        return this.voter_turnout >= (this.quorum_percentage || 0);
      case QuorumType.PERCENTAGE_OF_MEMBERS:
        return (this.voting_results.total_votes_cast / this.voting_results.total_eligible_voters) * 100 >= (this.quorum_percentage || 0);
      case QuorumType.FIXED_NUMBER:
        return this.voting_results.total_votes_cast >= (this.quorum_number || 0);
      case QuorumType.NO_QUORUM_REQUIRED:
        return true;
      default:
        return this.voting_results.quorum_met;
    }
  }

  get display_status(): string {
    return this.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get status_color(): string {
    switch (this.status) {
      case ElectionStatus.DRAFT:
        return 'gray';
      case ElectionStatus.SCHEDULED:
        return 'blue';
      case ElectionStatus.NOMINATION_PHASE:
        return 'purple';
      case ElectionStatus.CAMPAIGN_PERIOD:
        return 'indigo';
      case ElectionStatus.VOTING_PERIOD:
        return 'green';
      case ElectionStatus.VOTING_ENDED:
        return 'yellow';
      case ElectionStatus.RESULTS_PENDING:
        return 'orange';
      case ElectionStatus.COMPLETED:
        return 'emerald';
      case ElectionStatus.CANCELLED:
        return 'red';
      case ElectionStatus.POSTPONED:
        return 'gray';
      case ElectionStatus.UNDER_REVIEW:
        return 'orange';
      default:
        return 'gray';
    }
  }

  get display_type(): string {
    return this.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get current_phase(): string {
    const now = new Date();

    if (this.status === ElectionStatus.NOMINATION_PHASE &&
        this.voting_schedule?.nomination_start_date &&
        this.voting_schedule?.nomination_end_date) {
      if (now >= this.voting_schedule.nomination_start_date && now <= this.voting_schedule.nomination_end_date) {
        return 'Nomination Period';
      }
    }

    if (this.status === ElectionStatus.CAMPAIGN_PERIOD &&
        this.voting_schedule?.campaign_start_date &&
        this.voting_schedule?.campaign_end_date) {
      if (now >= this.voting_schedule.campaign_start_date && now <= this.voting_schedule.campaign_end_date) {
        return 'Campaign Period';
      }
    }

    if (this.status === ElectionStatus.VOTING_PERIOD &&
        this.voting_schedule?.voting_start_date &&
        this.voting_schedule?.voting_end_date) {
      if (now >= this.voting_schedule.voting_start_date && now <= this.voting_schedule.voting_end_date) {
        return 'Voting Period';
      }
    }

    return this.display_status;
  }

  get content_preview(): string {
    if (!this.description) return '';
    return this.description.length > 150 ? this.description.substring(0, 147) + '...' : this.description;
  }

  // Business logic methods
  startNominationPhase(): void {
    if (this.status !== ElectionStatus.SCHEDULED) {
      throw new Error('Election must be scheduled to start nomination phase');
    }

    if (!this.voting_schedule?.nomination_start_date || !this.voting_schedule?.nomination_end_date) {
      throw new Error('Nomination dates must be set');
    }

    this.status = ElectionStatus.NOMINATION_PHASE;
  }

  startCampaignPeriod(): void {
    if (this.status !== ElectionStatus.NOMINATION_PHASE) {
      throw new Error('Election must be in nomination phase to start campaign period');
    }

    this.status = ElectionStatus.CAMPAIGN_PERIOD;
  }

  startVotingPeriod(): void {
    if (this.status !== ElectionStatus.CAMPAIGN_PERIOD) {
      throw new Error('Election must be in campaign period to start voting');
    }

    if (!this.voting_schedule?.voting_start_date || !this.voting_schedule?.voting_end_date) {
      throw new Error('Voting dates must be set');
    }

    this.status = ElectionStatus.VOTING_PERIOD;
  }

  endVotingPeriod(): void {
    if (this.status !== ElectionStatus.VOTING_PERIOD) {
      throw new Error('Election must be in voting period to end voting');
    }

    this.status = ElectionStatus.VOTING_ENDED;
  }

  completeElection(): void {
    if (this.status !== ElectionStatus.RESULTS_PENDING) {
      throw new Error('Results must be finalized before completing election');
    }

    this.status = ElectionStatus.COMPLETED;
  }

  cancelElection(reason: string): void {
    this.status = ElectionStatus.CANCELLED;
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.cancellation_reason = reason;
    this.metadata.cancellation_date = new Date();
  }

  postponeElection(newDates: Partial<{
    nomination_start_date: Date;
    nomination_end_date: Date;
    campaign_start_date: Date;
    campaign_end_date: Date;
    voting_start_date: Date;
    voting_end_date: Date;
  }>, reason: string): void {
    this.status = ElectionStatus.POSTPONED;

    if (this.voting_schedule) {
      Object.assign(this.voting_schedule, newDates);
    }

    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.postponal_reason = reason;
    this.metadata.postponal_date = new Date();
    this.metadata.original_schedule = this.voting_schedule;
  }

  addAuditEntry(entry: {
    action: string;
    user_id: string;
    user_name: string;
    details: Record<string, any>;
    ip_address?: string;
    user_agent?: string;
  }): void {
    if (!this.audit_log) {
      this.audit_log = [];
    }

    this.audit_log.push({
      id: '', // Will be generated
      timestamp: new Date(),
      ...entry,
    });
  }

  addCandidate(candidateData: {
    position_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    statement?: string;
    photo?: string;
    qualifications?: string[];
    experience?: string;
    is_write_in?: boolean;
  }): void {
    if (!this.candidates) {
      this.candidates = [];
    }

    this.candidates.push({
      id: '', // Will be generated
      ...candidateData,
      nomination_date: new Date(),
      nomination_status: 'pending',
      is_write_in: candidateData.is_write_in || false,
    });
  }

  approveCandidate(candidateId: string, approvedBy: string): void {
    const candidate = this.candidates?.find(c => c.id === candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    candidate.nomination_status = 'approved';
    this.addAuditEntry({
      action: 'candidate_approved',
      user_id: approvedBy,
      user_name: '', // Will be populated
      details: { candidate_id: candidateId, candidate_name: candidate.user_name },
    });
  }

  rejectCandidate(candidateId: string, reason: string, rejectedBy: string): void {
    const candidate = this.candidates?.find(c => c.id === candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    candidate.nomination_status = 'rejected';
    this.addAuditEntry({
      action: 'candidate_rejected',
      user_id: rejectedBy,
      user_name: '', // Will be populated
      details: { candidate_id: candidateId, candidate_name: candidate.user_name, reason },
    });
  }

  withdrawCandidate(candidateId: string, reason: string, withdrawnBy: string): void {
    const candidate = this.candidates?.find(c => c.id === candidateId);
    if (!candidate) {
      throw new Error('Candidate not found');
    }

    candidate.nomination_status = 'withdrawn';
    candidate.withdrawal_reason = reason;
    this.addAuditEntry({
      action: 'candidate_withdrawn',
      user_id: withdrawnBy,
      user_name: '', // Will be populated
      details: { candidate_id: candidateId, candidate_name: candidate.user_name, reason },
    });
  }

  // Static factory methods
  static createBoardElection(data: {
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
  }): Partial<ElectionEntity> {
    return {
      title: data.title,
      description: data.description,
      type: ElectionType.BOARD_MEMBERS,
      status: ElectionStatus.DRAFT,
      vote_type: VoteType.SINGLE_CHOICE,
      eligibility_type: EligibilityType.OWNERS_AND_TENANTS,
      quorum_type: QuorumType.PERCENTAGE_OF_MEMBERS,
      quorum_percentage: 25,
      secret_ballot: true,
      anonymous_voting: true,
      tenant_id: data.tenant_id,
      created_by: data.created_by,
      positions: data.positions.map((p, index) => ({
        id: '', // Will be generated
        ...p,
        write_in_allowed: true,
      })),
      voting_schedule: data.voting_schedule,
      voting_methods: {
        online_voting: true,
        in_person_voting: false,
        mail_voting: false,
        proxy_voting: false,
        electronic_signature: true,
        two_factor_auth: true,
      },
      election_settings: {
        allow_nomination: true,
        self_nomination_allowed: true,
        require_nomination_second: false,
        allow_candidate_statements: true,
        allow_candidate_photos: true,
        allow_endorsements: true,
      },
    };
  }

  static createBudgetApproval(data: {
    title: string;
    description: string;
    tenant_id: string;
    created_by: string;
    budget_details: any;
    voting_schedule: {
      voting_start_date: Date;
      voting_end_date: Date;
    };
  }): Partial<ElectionEntity> {
    return {
      title: data.title,
      description: data.description,
      type: ElectionType.BUDGET_APPROVAL,
      status: ElectionStatus.DRAFT,
      vote_type: VoteType.YES_NO_ABSTAIN,
      eligibility_type: EligibilityType.PROPERTY_OWNERS_ONLY,
      quorum_type: QuorumType.PERCENTAGE_OF_MEMBERS,
      quorum_percentage: 33.33,
      secret_ballot: true,
      anonymous_voting: true,
      tenant_id: data.tenant_id,
      created_by: data.created_by,
      ballot_options: [
        {
          id: 'approve',
          text: 'Approve Budget',
          description: 'I approve the proposed budget',
          order: 1,
        },
        {
          id: 'reject',
          text: 'Reject Budget',
          description: 'I reject the proposed budget',
          order: 2,
        },
        {
          id: 'abstain',
          text: 'Abstain',
          description: 'I choose to abstain from this vote',
          order: 3,
        },
      ],
      voting_schedule: data.voting_schedule,
      voting_methods: {
        online_voting: true,
        in_person_voting: true,
        mail_voting: false,
        proxy_voting: true,
        electronic_signature: true,
        two_factor_auth: true,
      },
      election_settings: {
        allow_nomination: false,
      },
      metadata: {
        budget_details: data.budget_details,
      },
    };
  }
}