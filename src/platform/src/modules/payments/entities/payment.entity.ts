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

export enum PaymentType {
  HOA_DUES = 'hoa_dues',
  SPECIAL_ASSESSMENT = 'special_assessment',
  LATE_FEE = 'late_fee',
  INTEREST_CHARGE = 'interest_charge',
  MAINTENANCE_FEE = 'maintenance_fee',
  AMENITY_FEE = 'amenity_fee',
  RESERVATION_FEE = 'reservation_fee',
  PERMIT_FEE = 'permit_fee',
  VIOLATION_FINE = 'violation_fine',
  SERVICE_FEE = 'service_fee',
  INSURANCE_FEE = 'insurance_fee',
  LEGAL_FEE = 'legal_fee',
  UTILITY_FEE = 'utility_fee',
  DONATION = 'donation',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  OTHER = 'other',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CHARGEBACK = 'chargeback',
  DISPUTED = 'disputed',
  EXPIRED = 'expired',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  ACH = 'ach',
  CHECK = 'check',
  CASH = 'cash',
  MONEY_ORDER = 'money_order',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  SQUARE = 'square',
  VENMO = 'venmo',
  ZELLE = 'zelle',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  CRYPTO = 'crypto',
  OTHER = 'other',
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  BRAIN_TREE = 'brain_tree',
  AUTHORIZE_NET = 'authorize_net',
  ADYEN = 'adyen',
  MANUAL = 'manual',
  CHECK_PROCESSING = 'check_processing',
  OTHER = 'other',
}

export enum PaymentFrequency {
  ONE_TIME = 'one_time',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  CUSTOM = 'custom',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  VOID = 'void',
  WRITTEN_OFF = 'written_off',
}

export enum RecurringPaymentStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
  COMPLETED = 'completed',
}

@Entity('payments')
@Index(['tenant_id', 'status'])
@Index(['status', 'created_at'])
@Index(['type', 'created_at'])
@Index(['household_id', 'created_at'])
@Index(['user_id', 'created_at'])
@Index(['due_date', 'status'])
export class PaymentEntity extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  transaction_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoice_number: string;

  @Column({ type: 'enum', enum: PaymentType })
  type: PaymentType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fee_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'date' })
  due_date: Date;

  @Column({ type: 'date', nullable: true })
  paid_date: Date;

  @Column({ type: 'date', nullable: true })
  refunded_date: Date;

  @Column({ type: 'date', nullable: true })
  chargeback_date: Date;

  @Column({ type: 'uuid' })
  household_id: string;

  @ManyToOne(() => HouseholdEntity, { nullable: false })
  @JoinColumn({ name: 'household_id' })
  household: HouseholdEntity;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  paid_by_user_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'paid_by_user_id' })
  paid_by_user: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  billing_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    is_same_as_household: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  payment_details: {
    gateway_transaction_id?: string;
    gateway_payment_intent_id?: string;
    stripe_charge_id?: string;
    paypal_transaction_id?: string;
    bank_account_last4?: string;
    card_last4?: string;
    card_brand?: string;
    card_exp_month?: number;
    card_exp_year?: number;
    check_number?: string;
    authorization_code?: string;
    avs_response?: string;
    cvv_response?: string;
    risk_score?: number;
    ip_address?: string;
    user_agent?: string;
    device_id?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  invoice_details: {
    invoice_id?: string;
    invoice_status?: InvoiceStatus;
    invoice_date?: Date;
    due_date?: Date;
    paid_date?: Date;
    late_fee_date?: Date;
    description?: string;
    line_items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
      tax_rate?: number;
      tax_amount?: number;
    }>;
    terms?: string;
    notes?: string;
    footer?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  recurring_payment: {
    recurring_payment_id?: string;
    frequency: PaymentFrequency;
    interval_months?: number;
    next_payment_date?: Date;
    end_date?: Date;
    auto_renew?: boolean;
    status?: RecurringPaymentStatus;
    retry_count?: number;
    max_retries?: number;
    last_retry_date?: Date;
  };

  @Column({ type: 'jsonb', nullable: true })
  assessment_details: {
    assessment_type?: string;
    assessment_period?: {
      start_date: Date;
      end_date: Date;
    };
    project_name?: string;
    project_description?: string;
    approved_by?: string;
    approved_date?: Date;
    total_assessment?: number;
    per_unit_amount?: number;
    payment_schedule?: string[];
    exemptions?: Array<{
      household_id: string;
      reason: string;
      amount: number;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  fee_details: {
    fee_type?: string;
    reason?: string;
    reference_id?: string;
    reference_type?: string;
    waiver_reason?: string;
    waiver_approved_by?: string;
    waiver_date?: Date;
    appeal_deadline?: Date;
    appeal_status?: 'pending' | 'approved' | 'rejected';
  };

  @Column({ type: 'jsonb', nullable: true })
  refund_details: {
    refund_id?: string;
    refund_amount: number;
    refund_reason: string;
    processed_by?: string;
    refund_method?: PaymentMethod;
    partial_refund?: boolean;
    original_payment_id?: string;
    refund_date?: Date;
    gateway_refund_id?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  chargeback_details: {
    chargeback_id?: string;
    chargeback_amount: number;
    chargeback_reason?: string;
    chargeback_date?: Date;
    status?: string;
    response_deadline?: Date;
    evidence_required?: string[];
    evidence_submitted?: Array<{
      type: string;
      url: string;
      uploaded_at: Date;
    }>;
    outcome?: 'won' | 'lost' | 'pending';
  };

  @Column({ type: 'jsonb', nullable: true })
  dispute_details: {
    dispute_id?: string;
    dispute_reason?: string;
    dispute_date?: Date;
    status?: string;
    resolution?: string;
    resolved_date?: Date;
    amount_disputed?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  installment_details: {
    installment_plan_id?: string;
    total_installments?: number;
    current_installment?: number;
    installment_amount?: number;
    installment_frequency?: string;
    next_installment_date?: Date;
    paid_installments?: Array<{
      installment_number: number;
      amount: number;
      paid_date: Date;
      payment_id: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  payment_plan: {
    plan_id?: string;
    plan_type?: string;
    total_amount?: number;
    down_payment?: number;
    number_of_payments?: number;
    payment_frequency?: string;
    interest_rate?: number;
    late_fee_rate?: number;
    start_date?: Date;
    end_date?: Date;
    status?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    source?: string;
    campaign?: string;
    promotion_code?: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
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
  }>;

  @Column({ type: 'jsonb', nullable: true })
  notifications: {
    payment_reminder_sent?: boolean;
    late_fee_reminder_sent?: boolean;
    receipt_sent?: boolean;
    refund_notification_sent?: boolean;
    last_notification_date?: Date;
  };

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  is_recurring: boolean;

  @Column({ type: 'boolean', default: false })
  is_automatic_payment: boolean;

  @Column({ type: 'boolean', default: false })
  requires_manual_review: boolean;

  @Column({ type: 'boolean', default: false })
  is_tax_exempt: boolean;

  @Column({ type: 'boolean', default: false })
  send_receipt: boolean;

  @Column({ type: 'boolean', default: false })
  send_late_notices: boolean;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Column({ type: 'integer', default: 3 })
  max_retries: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_retry_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  settled_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_attempt_date: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Virtual properties
  get is_pending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  get is_processing(): boolean {
    return this.status === PaymentStatus.PROCESSING;
  }

  get is_completed(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get is_failed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get is_cancelled(): boolean {
    return this.status === PaymentStatus.CANCELLED;
  }

  get is_refunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  get is_partially_refunded(): boolean {
    return this.status === PaymentStatus.PARTIALLY_REFUNDED;
  }

  get is_chargeback(): boolean {
    return this.status === PaymentStatus.CHARGEBACK;
  }

  get is_disputed(): boolean {
    return this.status === PaymentStatus.DISPUTED;
  }

  get is_overdue(): boolean {
    return !this.paid_date && this.due_date && new Date() > this.due_date;
  }

  get can_retry(): boolean {
    return (
      this.is_failed &&
      this.retry_count < this.max_retries &&
      (!this.next_retry_date || new Date() >= this.next_retry_date)
    );
  }

  get is_expired(): boolean {
    return this.expires_at && new Date() > this.expires_at;
  }

  get days_overdue(): number {
    if (!this.is_overdue) return 0;
    const now = new Date();
    const diff = now.getTime() - this.due_date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  get days_until_due(): number {
    if (this.paid_date) return -1;
    const now = new Date();
    const diff = this.due_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get amount_paid(): number {
    if (this.is_refunded) return 0;
    if (this.is_partially_refunded && this.refund_details) {
      return this.total_amount - this.refund_details.refund_amount;
    }
    return this.total_amount;
  }

  get balance_due(): number {
    if (this.is_completed || this.is_paid) return 0;
    return this.total_amount;
  }

  get is_paid(): boolean {
    return this.is_completed || (this.paid_date && this.balance_due <= 0);
  }

  get has_tax(): boolean {
    return this.tax_amount > 0;
  }

  get has_fees(): boolean {
    return this.fee_amount > 0;
  }

  get has_discount(): boolean {
    return this.discount_amount > 0;
  }

  get display_status(): string {
    return this.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get status_color(): string {
    switch (this.status) {
      case PaymentStatus.PENDING:
        return 'yellow';
      case PaymentStatus.PROCESSING:
        return 'blue';
      case PaymentStatus.COMPLETED:
        return 'green';
      case PaymentStatus.FAILED:
        return 'red';
      case PaymentStatus.CANCELLED:
        return 'gray';
      case PaymentStatus.REFUNDED:
        return 'orange';
      case PaymentStatus.PARTIALLY_REFUNDED:
        return 'orange';
      case PaymentStatus.CHARGEBACK:
        return 'red';
      case PaymentStatus.DISPUTED:
        return 'red';
      case PaymentStatus.EXPIRED:
        return 'gray';
      default:
        return 'gray';
    }
  }

  get display_type(): string {
    return this.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get display_method(): string {
    return this.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get display_gateway(): string {
    return this.gateway.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get time_since_created(): string {
    const now = new Date();
    const diff = now.getTime() - this.created_at.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  }

  // Business logic methods
  markAsCompleted(processedAt?: Date): void {
    this.status = PaymentStatus.COMPLETED;
    this.paid_date = processedAt || new Date();
    this.processed_at = processedAt || new Date();
    this.next_retry_date = null;
  }

  markAsFailed(reason: string): void {
    this.status = PaymentStatus.FAILED;
    this.failure_reason = reason;
    this.retry_count += 1;

    // Calculate next retry time (exponential backoff)
    const delay = Math.pow(2, this.retry_count) * 60000; // 1min, 2min, 4min, etc.
    this.next_retry_date = new Date(Date.now() + delay);
  }

  cancel(reason: string): void {
    this.status = PaymentStatus.CANCELLED;
    this.cancellation_reason = reason;
  }

  refund(amount: number, reason: string, processedBy: string): void {
    if (!this.is_completed) {
      throw new Error('Only completed payments can be refunded');
    }

    this.status = amount >= this.total_amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

    this.refund_details = {
      refund_amount: amount,
      refund_reason: reason,
      processed_by,
      refund_date: new Date(),
      original_payment_id: this.id,
      partial_refund: amount < this.total_amount,
    };

    this.refunded_date = new Date();
  }

  markAsChargeback(amount: number, reason: string): void {
    this.status = PaymentStatus.CHARGEBACK;
    this.chargeback_details = {
      chargeback_amount: amount,
      chargeback_reason: reason,
      chargeback_date: new Date(),
      status: 'pending',
    };
  }

  markAsDisputed(reason: string, amount?: number): void {
    this.status = PaymentStatus.DISPUTED;
    this.dispute_details = {
      dispute_reason: reason,
      dispute_date: new Date(),
      status: 'pending',
      amount_disputed: amount || this.total_amount,
    };
  }

  addRetry(): void {
    if (!this.can_retry) {
      throw new Error('Payment cannot be retried');
    }

    this.retry_count += 1;
    this.last_attempt_date = new Date();

    // Calculate next retry time
    const delay = Math.pow(2, this.retry_count) * 60000;
    this.next_retry_date = new Date(Date.now() + delay);
  }

  addAuditEntry(entry: {
    action: string;
    user_id: string;
    user_name: string;
    details: Record<string, any>;
    ip_address?: string;
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

  // Static factory methods
  static createHOADues(data: {
    household_id: string;
    user_id?: string;
    amount: number;
    due_date: Date;
    period: string;
    description?: string;
    recurring?: boolean;
    frequency?: PaymentFrequency;
  }): Partial<PaymentEntity> {
    return {
      transaction_id: '', // Will be generated
      type: PaymentType.HOA_DUES,
      status: PaymentStatus.PENDING,
      payment_method: PaymentMethod.STRIPE, // Default
      gateway: PaymentGateway.STRIPE,
      amount: data.amount,
      total_amount: data.amount,
      currency: 'USD',
      due_date: data.due_date,
      household_id: data.household_id,
      user_id: data.user_id,
      is_recurring: data.recurring || false,
      recurring_payment: data.recurring ? {
        frequency: data.frequency || PaymentFrequency.MONTHLY,
        auto_renew: true,
        status: RecurringPaymentStatus.ACTIVE,
      } : undefined,
      invoice_details: {
        invoice_status: InvoiceStatus.DRAFT,
        description: data.description || `HOA Dues - ${data.period}`,
        line_items: [{
          id: 'hoa-dues',
          description: `HOA Dues - ${data.period}`,
          quantity: 1,
          unit_price: data.amount,
          amount: data.amount,
        }],
      },
      metadata: {
        source: 'hoa_dues',
        period: data.period,
      },
    };
  }

  static createSpecialAssessment(data: {
    household_id: string;
    amount: number;
    due_date: Date;
    project_name: string;
    project_description: string;
    assessment_type: string;
    assessment_period: {
      start_date: Date;
      end_date: Date;
    };
    payment_schedule?: string[];
  }): Partial<PaymentEntity> {
    return {
      transaction_id: '', // Will be generated
      type: PaymentType.SPECIAL_ASSESSMENT,
      status: PaymentStatus.PENDING,
      payment_method: PaymentMethod.STRIPE,
      gateway: PaymentGateway.STRIPE,
      amount: data.amount,
      total_amount: data.amount,
      currency: 'USD',
      due_date: data.due_date,
      household_id: data.household_id,
      assessment_details: {
        assessment_type: data.assessment_type,
        assessment_period: data.assessment_period,
        project_name: data.project_name,
        project_description: data.project_description,
        payment_schedule: data.payment_schedule || [],
      },
      invoice_details: {
        invoice_status: InvoiceStatus.DRAFT,
        description: `Special Assessment - ${data.project_name}`,
        line_items: [{
          id: 'special-assessment',
          description: `Special Assessment - ${data.project_name}`,
          quantity: 1,
          unit_price: data.amount,
          amount: data.amount,
        }],
      },
      metadata: {
        source: 'special_assessment',
        project_name: data.project_name,
        assessment_type: data.assessment_type,
      },
    };
  }

  static createLateFee(data: {
    household_id: string;
    original_payment_id: string;
    amount: number;
    due_date: Date;
    reason: string;
  }): Partial<PaymentEntity> {
    return {
      transaction_id: '', // Will be generated
      type: PaymentType.LATE_FEE,
      status: PaymentStatus.PENDING,
      payment_method: PaymentMethod.STRIPE,
      gateway: PaymentGateway.STRIPE,
      amount: data.amount,
      total_amount: data.amount,
      currency: 'USD',
      due_date: data.due_date,
      household_id: data.household_id,
      fee_details: {
        fee_type: 'late_fee',
        reason: data.reason,
        reference_id: data.original_payment_id,
        reference_type: 'payment',
      },
      invoice_details: {
        invoice_status: InvoiceStatus.DRAFT,
        description: `Late Fee - ${data.reason}`,
        line_items: [{
          id: 'late-fee',
          description: `Late Fee - ${data.reason}`,
          quantity: 1,
          unit_price: data.amount,
          amount: data.amount,
        }],
      },
      metadata: {
        source: 'late_fee',
        original_payment_id: data.original_payment_id,
        reason: data.reason,
      },
    };
  }
}