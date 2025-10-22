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

export enum PermitType {
  NEW_CONSTRUCTION = 'new_construction',
  RENOVATION = 'renovation',
  ADDITION = 'addition',
  LANDSCAPING = 'landscaping',
  FENCE = 'fence',
  POOL = 'pool',
  DECK = 'deck',
  PATIO = 'patio',
  GARAGE = 'garage',
  ROOFING = 'roofing',
  SIDING = 'siding',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  HVAC = 'hvac',
  SOLAR_PANELS = 'solar_panels',
  DEMOLITION = 'demolition',
  TEMPORARY_STRUCTURE = 'temporary_structure',
  OTHER = 'other',
}

export enum PermitStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ISSUED = 'issued',
  IN_PROGRESS = 'in_progress',
  INSPECTION_REQUIRED = 'inspection_required',
  INSPECTION_SCHEDULED = 'inspection_scheduled',
  INSPECTION_PASSED = 'inspection_passed',
  INSPECTION_FAILED = 'inspection_failed',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum PermitPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum InspectionType {
  FOUNDATION = 'foundation',
  FRAMING = 'framing',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  MECHANICAL = 'mechanical',
  INSULATION = 'insulation',
  DRYWALL = 'drywall',
  EXTERIOR = 'exterior',
  ROOFING = 'roofing',
  FINAL = 'final',
  SPECIAL = 'special',
}

@Entity('construction_permits')
@Index(['tenant_id', 'status'])
@Index(['household_id', 'status'])
@Index(['contractor_id', 'status'])
@Index(['permit_type', 'created_at'])
@Index(['priority', 'status'])
export class ConstructionPermitEntity extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  permit_number: string;

  @Column({ type: 'enum', enum: PermitType })
  permit_type: PermitType;

  @Column({ type: 'enum', enum: PermitStatus, default: PermitStatus.DRAFT })
  status: PermitStatus;

  @Column({ type: 'enum', enum: PermitPriority, default: PermitPriority.NORMAL })
  priority: PermitPriority;

  @Column({ type: 'varchar', length: 255 })
  project_title: string;

  @Column({ type: 'text' })
  project_description: string;

  @Column({ type: 'jsonb', nullable: true })
  project_details: {
    estimated_cost: number;
    estimated_duration_days: number;
    square_footage: number;
    affected_areas: string[];
    materials: string[];
    special_requirements: string[];
  };

  @Column({ type: 'uuid' })
  household_id: string;

  @ManyToOne(() => HouseholdEntity, { nullable: false })
  @JoinColumn({ name: 'household_id' })
  household: HouseholdEntity;

  @Column({ type: 'uuid', nullable: true })
  property_owner_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'property_owner_id' })
  property_owner: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  contractor_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'contractor_id' })
  contractor: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  contractor_info: {
    name: string;
    company: string;
    license_number: string;
    phone: string;
    email: string;
    address: string;
    insurance_certificate: string;
    workers_comp: string;
  };

  @Column({ type: 'uuid', nullable: true })
  architect_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'architect_id' })
  architect: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  architect_info: {
    name: string;
    company: string;
    license_number: string;
    phone: string;
    email: string;
    address: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  project_documents: {
    site_plan: string;
    floor_plans: string[];
    elevation_drawings: string[];
    engineering_specs: string[];
    material_specifications: string[];
    photos: string[];
    contracts: string[];
    insurance_documents: string[];
    permits: string[];
    other_documents: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  review_comments: Array<{
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    comment: string;
    created_at: Date;
    is_internal: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  inspection_results: Array<{
    id: string;
    type: InspectionType;
    inspector_id: string;
    inspector_name: string;
    scheduled_date: Date;
    completed_date?: Date;
    status: 'scheduled' | 'passed' | 'failed' | 'cancelled';
    comments: string;
    photos?: string[];
    next_inspection?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  approval_workflow: {
    submitted_by: string;
    submitted_at: Date;
    reviewed_by?: string;
    reviewed_at?: Date;
    approved_by?: string;
    approved_at?: Date;
    issued_by?: string;
    issued_at?: Date;
    conditions?: string[];
    special_requirements?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  permit_conditions: {
    work_hours: {
      start_time: string;
      end_time: string;
      allowed_days: string[];
      holidays_exempt: boolean;
    };
    noise_restrictions: {
      max_decibels: number;
      quiet_hours: { start: string; end: string };
    };
    parking_requirements: {
      contractor_parking: string[];
      material_storage: string;
      equipment_storage: string;
    };
    safety_requirements: string[];
    environmental_protection: string[];
    community_impact: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  fees: {
    application_fee: number;
    review_fee: number;
    inspection_fee: number;
    impact_fee: number;
    other_fees: Array<{ name: string; amount: number; description: string }>;
    total_fee: number;
    paid_amount: number;
    balance_due: number;
    payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  };

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  completion_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_start_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_completion_date: Date;

  @Column({ type: 'date', nullable: true })
  issued_date: Date;

  @Column({ type: 'date', nullable: true })
  expires_date: Date;

  @Column({ type: 'date', nullable: true })
  final_inspection_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_inspection_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_inspection_date: Date;

  @Column({ type: 'jsonb', nullable: true })
  violations: Array<{
    id: string;
    type: string;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    discovered_date: Date;
    resolved_date?: Date;
    fine?: number;
    status: 'open' | 'resolved' | 'appealed';
  }>;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'text', nullable: true })
  suspension_reason: string;

  @Column({ type: 'boolean', default: false })
  is_expedited: boolean;

  @Column({ type: 'boolean', default: false })
  requires_insurance: boolean;

  @Column({ type: 'boolean', default: false })
  requires_engineering_review: boolean;

  @Column({ type: 'boolean', default: false })
  requires_neighbor_notification: boolean;

  @Column({ type: 'boolean', default: false })
  insurance_verified: boolean;

  @Column({ type: 'boolean', default: false })
  contractor_verified: boolean;

  @Column({ type: 'boolean', default: false })
  documents_verified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  neighbor_notifications: Array<{
    neighbor_id: string;
    neighbor_name: string;
    property_address: string;
    notified_date: Date;
    response?: string;
    objections?: string[];
  }>;

  @Column({ type: 'jsonb', nullable: true })
  change_orders: Array<{
    id: string;
    description: string;
    cost_change: number;
    duration_change: number;
    requested_date: Date;
    approved_date?: Date;
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  progress_updates: Array<{
    id: string;
    update_date: Date;
    completion_percentage: number;
    description: string;
    photos?: string[];
    updated_by: string;
    issues?: string[];
  }>;

  @Column({ type: 'jsonb', nullable: true })
  site_visits: Array<{
    id: string;
    visitor_name: string;
    visit_date: Date;
    purpose: string;
    findings: string;
    photos?: string[];
    next_action_required?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  final_certification: {
    certificate_number: string;
    issued_date: Date;
    issued_by: string;
    final_inspection_passed: boolean;
    all_violations_resolved: boolean;
    final_fees_paid: boolean;
    certificate_issued: boolean;
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
    return this.status === PermitStatus.DRAFT;
  }

  get is_submitted(): boolean {
    return this.status === PermitStatus.SUBMITTED;
  }

  get is_under_review(): boolean {
    return this.status === PermitStatus.UNDER_REVIEW;
  }

  get is_approved(): boolean {
    return this.status === PermitStatus.APPROVED;
  }

  get is_issued(): boolean {
    return this.status === PermitStatus.ISSUED;
  }

  get is_in_progress(): boolean {
    return this.status === PermitStatus.IN_PROGRESS;
  }

  get is_completed(): boolean {
    return this.status === PermitStatus.COMPLETED;
  }

  get is_expired(): boolean {
    return this.status === PermitStatus.EXPIRED;
  }

  get is_cancelled(): boolean {
    return this.status === PermitStatus.CANCELLED;
  }

  get is_suspended(): boolean {
    return this.status === PermitStatus.SUSPENDED;
  }

  get is_active(): boolean {
    return [PermitStatus.ISSUED, PermitStatus.IN_PROGRESS].includes(this.status) &&
           (!this.expires_date || new Date() <= this.expires_date);
  }

  get requires_inspection(): boolean {
    return this.status === PermitStatus.INSPECTION_REQUIRED ||
           this.status === PermitStatus.INSPECTION_SCHEDULED ||
           (this.is_in_progress && this.next_inspection_date && new Date() >= this.next_inspection_date);
  }

  get has_violations(): boolean {
    return this.violations && this.violations.some(v => v.status === 'open');
  }

  get is_overdue(): boolean {
    if (!this.completion_date) return false;
    return new Date() > this.completion_date && !this.is_completed;
  }

  get days_until_expiry(): number {
    if (!this.expires_date) return -1;
    const now = new Date();
    const diff = this.expires_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get project_duration_days(): number {
    if (!this.start_date || !this.completion_date) return 0;
    const diff = this.completion_date.getTime() - this.start_date.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get actual_duration_days(): number {
    if (!this.actual_start_date || !this.actual_completion_date) return 0;
    const diff = this.actual_completion_date.getTime() - this.actual_start_date.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get completion_percentage(): number {
    if (!this.progress_updates || this.progress_updates.length === 0) return 0;
    const latestUpdate = this.progress_updates[this.progress_updates.length - 1];
    return latestUpdate.completion_percentage || 0;
  }

  get remaining_work_days(): number {
    if (!this.actual_start_date || !this.completion_date) return 0;
    const now = new Date();
    const diff = this.completion_date.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  get total_fees(): number {
    if (!this.fees) return 0;
    return this.fees.total_fee || 0;
  }

  get fees_paid(): number {
    if (!this.fees) return 0;
    return this.fees.paid_amount || 0;
  }

  get balance_due(): number {
    if (!this.fees) return 0;
    return this.fees.balance_due || 0;
  }

  get is_fully_paid(): boolean {
    return this.balance_due <= 0;
  }

  get pending_inspections(): number {
    if (!this.inspection_results) return 0;
    return this.inspection_results.filter(i => i.status === 'scheduled').length;
  }

  get failed_inspections(): number {
    if (!this.inspection_results) return 0;
    return this.inspection_results.filter(i => i.status === 'failed').length;
  }

  get passed_inspections(): number {
    if (!this.inspection_results) return 0;
    return this.inspection_results.filter(i => i.status === 'passed').length;
  }

  get display_status(): string {
    return this.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get status_color(): string {
    switch (this.status) {
      case PermitStatus.DRAFT:
        return 'gray';
      case PermitStatus.SUBMITTED:
        return 'blue';
      case PermitStatus.UNDER_REVIEW:
        return 'orange';
      case PermitStatus.ADDITIONAL_INFO_REQUIRED:
        return 'yellow';
      case PermitStatus.APPROVED:
        return 'green';
      case PermitStatus.ISSUED:
        return 'emerald';
      case PermitStatus.IN_PROGRESS:
        return 'blue';
      case PermitStatus.INSPECTION_REQUIRED:
        return 'purple';
      case PermitStatus.INSPECTION_SCHEDULED:
        return 'indigo';
      case PermitStatus.INSPECTION_PASSED:
        return 'green';
      case PermitStatus.INSPECTION_FAILED:
        return 'red';
      case PermitStatus.COMPLETED:
        return 'green';
      case PermitStatus.REJECTED:
        return 'red';
      case PermitStatus.CANCELLED:
        return 'gray';
      case PermitStatus.SUSPENDED:
        return 'orange';
      case PermitStatus.EXPIRED:
        return 'red';
      default:
        return 'gray';
    }
  }

  get type_display(): string {
    return this.permit_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get priority_display(): string {
    return this.priority.replace(/\b\w/g, l => l.toUpperCase());
  }

  get priority_color(): string {
    switch (this.priority) {
      case PermitPriority.LOW:
        return 'gray';
      case PermitPriority.NORMAL:
        return 'blue';
      case PermitPriority.HIGH:
        return 'orange';
      case PermitPriority.URGENT:
        return 'red';
      default:
        return 'gray';
    }
  }

  // Business logic methods
  submitForReview(): void {
    if (this.status !== PermitStatus.DRAFT) {
      throw new Error('Permit must be in draft status to submit for review');
    }
    this.status = PermitStatus.SUBMITTED;
    this.approval_workflow = {
      ...this.approval_workflow,
      submitted_by: '', // Will be set by service
      submitted_at: new Date(),
    };
  }

  approve(approvedBy: string): void {
    if (![PermitStatus.SUBMITTED, PermitStatus.UNDER_REVIEW].includes(this.status)) {
      throw new Error('Permit must be submitted or under review to approve');
    }
    this.status = PermitStatus.APPROVED;
    this.approval_workflow = {
      ...this.approval_workflow,
      approved_by: approvedBy,
      approved_at: new Date(),
    };
  }

  reject(reason: string, rejectedBy: string): void {
    if (![PermitStatus.SUBMITTED, PermitStatus.UNDER_REVIEW].includes(this.status)) {
      throw new Error('Permit must be submitted or under review to reject');
    }
    this.status = PermitStatus.REJECTED;
    this.rejection_reason = reason;
    this.approval_workflow = {
      ...this.approval_workflow,
      reviewed_by: rejectedBy,
      reviewed_at: new Date(),
    };
  }

  issuePermit(issuedBy: string): void {
    if (this.status !== PermitStatus.APPROVED) {
      throw new Error('Permit must be approved to issue');
    }
    this.status = PermitStatus.ISSUED;
    this.issued_date = new Date();
    this.approval_workflow = {
      ...this.approval_workflow,
      issued_by: issuedBy,
      issued_at: new Date(),
    };

    // Set expiry date (typically 1 year from issue)
    this.expires_date = new Date();
    this.expires_date.setFullYear(this.expires_date.getFullYear() + 1);
  }

  startWork(): void {
    if (this.status !== PermitStatus.ISSUED) {
      throw new Error('Permit must be issued to start work');
    }
    this.status = PermitStatus.IN_PROGRESS;
    this.actual_start_date = new Date();
  }

  scheduleInspection(type: InspectionType, scheduledDate: Date, inspectorId: string): void {
    if (!this.inspection_results) {
      this.inspection_results = [];
    }

    this.inspection_results.push({
      id: '', // Will be generated
      type,
      inspector_id: inspectorId,
      inspector_name: '', // Will be populated by service
      scheduled_date: scheduledDate,
      status: 'scheduled',
      comments: '',
    });

    this.next_inspection_date = scheduledDate;
  }

  completeInspection(inspectionId: string, result: 'passed' | 'failed', comments: string, photos?: string[]): void {
    if (!this.inspection_results) return;

    const inspection = this.inspection_results.find(i => i.id === inspectionId);
    if (!inspection) return;

    inspection.status = result;
    inspection.comments = comments;
    inspection.completed_date = new Date();
    if (photos) {
      inspection.photos = photos;
    }

    this.last_inspection_date = new Date();

    // Determine next action
    if (result === 'failed') {
      this.status = PermitStatus.INSPECTION_FAILED;
    } else {
      // Check if all inspections are passed
      const pendingInspections = this.inspection_results.filter(i =>
        i.status === 'scheduled' || i.status === 'failed'
      );

      if (pendingInspections.length === 0) {
        this.status = PermitStatus.INSPECTION_PASSED;
      }
    }
  }

  completeProject(): void {
    if (this.status !== PermitStatus.IN_PROGRESS && this.status !== PermitStatus.INSPECTION_PASSED) {
      throw new Error('Permit must be in progress or inspections passed to complete');
    }
    this.status = PermitStatus.COMPLETED;
    this.actual_completion_date = new Date();
    this.final_inspection_date = new Date();
  }

  cancelPermit(reason: string, cancelledBy: string): void {
    this.status = PermitStatus.CANCELLED;
    this.cancellation_reason = reason;
  }

  suspendPermit(reason: string, suspendedBy: string): void {
    if (!this.is_active) {
      throw new Error('Only active permits can be suspended');
    }
    this.status = PermitStatus.SUSPENDED;
    this.suspension_reason = reason;
  }

  reactivatePermit(reactivatedBy: string): void {
    if (this.status !== PermitStatus.SUSPENDED) {
      throw new Error('Only suspended permits can be reactivated');
    }
    this.status = PermitStatus.IN_PROGRESS;
    this.suspension_reason = null;
  }

  extendPermit(newExpiryDate: Date, reason: string): void {
    if (!this.is_active) {
      throw new Error('Only active permits can be extended');
    }
    this.expires_date = newExpiryDate;

    if (!this.change_orders) {
      this.change_orders = [];
    }

    this.change_orders.push({
      id: '', // Will be generated
      description: `Permit extension: ${reason}`,
      cost_change: 0,
      duration_change: Math.ceil((newExpiryDate.getTime() - (this.expires_date?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
      requested_date: new Date(),
      approved_date: new Date(),
      status: 'approved',
      approved_by: '', // Will be set by service
    });
  }

  addProgressUpdate(completePercentage: number, description: string, photos?: string[], updatedBy: string): void {
    if (!this.progress_updates) {
      this.progress_updates = [];
    }

    this.progress_updates.push({
      id: '', // Will be generated
      update_date: new Date(),
      completion_percentage: Math.max(0, Math.min(100, completePercentage)),
      description,
      photos,
      updated_by: updatedBy,
    });
  }

  addViolation(type: string, description: string, severity: 'minor' | 'major' | 'critical'): void {
    if (!this.violations) {
      this.violations = [];
    }

    this.violations.push({
      id: '', // Will be generated
      type,
      description,
      severity,
      discovered_date: new Date(),
      status: 'open',
    });
  }

  resolveViolation(violationId: string, resolutionDate?: Date): void {
    if (!this.violations) return;

    const violation = this.violations.find(v => v.id === violationId);
    if (!violation) return;

    violation.status = 'resolved';
    violation.resolved_date = resolutionDate || new Date();
  }

  // Static factory methods
  static createNewConstructionPermit(projectDetails: {
    household_id: string;
    project_title: string;
    project_description: string;
    estimated_cost: number;
    estimated_duration: number;
    start_date: Date;
    completion_date: Date;
    property_owner_id?: string;
  }): Partial<ConstructionPermitEntity> {
    return {
      permit_number: '', // Will be generated
      permit_type: PermitType.NEW_CONSTRUCTION,
      status: PermitStatus.DRAFT,
      priority: PermitPriority.NORMAL,
      project_title: projectDetails.project_title,
      project_description: projectDetails.project_description,
      household_id: projectDetails.household_id,
      property_owner_id: projectDetails.property_owner_id,
      start_date: projectDetails.start_date,
      completion_date: projectDetails.completion_date,
      project_details: {
        estimated_cost: projectDetails.estimated_cost,
        estimated_duration_days: projectDetails.estimated_duration,
        square_footage: 0,
        affected_areas: [],
        materials: [],
        special_requirements: [],
      },
    };
  }

  static createRenovationPermit(projectDetails: {
    household_id: string;
    project_title: string;
    project_description: string;
    estimated_cost: number;
    estimated_duration: number;
    start_date: Date;
    completion_date: Date;
    affected_areas: string[];
  }): Partial<ConstructionPermitEntity> {
    return {
      permit_number: '', // Will be generated
      permit_type: PermitType.RENOVATION,
      status: PermitStatus.DRAFT,
      priority: PermitPriority.NORMAL,
      project_title: projectDetails.project_title,
      project_description: projectDetails.project_description,
      household_id: projectDetails.household_id,
      start_date: projectDetails.start_date,
      completion_date: projectDetails.completion_date,
      project_details: {
        estimated_cost: projectDetails.estimated_cost,
        estimated_duration_days: projectDetails.estimated_duration,
        square_footage: 0,
        affected_areas: projectDetails.affected_areas,
        materials: [],
        special_requirements: [],
      },
    };
  }
}