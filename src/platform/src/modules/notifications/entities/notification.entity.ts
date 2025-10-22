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

export enum NotificationType {
  // Guest notifications
  GUEST_CREATED = 'guest_created',
  GUEST_APPROVED = 'guest_approved',
  GUEST_REJECTED = 'guest_rejected',
  GUEST_CHECKED_IN = 'guest_checked_in',
  GUEST_CHECKED_OUT = 'guest_checked_out',
  GUEST_PRE_REGISTRATION = 'guest_pre_registration',
  GUEST_ARRIVAL = 'guest_arrival',
  GUEST_OVERSTAYING = 'guest_overstaying',

  // Gate pass notifications
  GATE_PASS_CREATED = 'gate_pass_created',
  GATE_PASS_APPROVED = 'gate_pass_approved',
  GATE_PASS_REJECTED = 'gate_pass_rejected',
  GATE_PASS_EXPIRED = 'gate_pass_expired',
  GATE_PASS_USED = 'gate_pass_used',

  // Vehicle notifications
  VEHICLE_REGISTERED = 'vehicle_registered',
  VEHICLE_APPROVED = 'vehicle_approved',
  VEHICLE_EXPIRING = 'vehicle_expiring',
  VEHICLE_EXPIRED = 'vehicle_expired',

  // Household notifications
  HOUSEHOLD_CREATED = 'household_created',
  HOUSEHOLD_UPDATED = 'household_updated',
  HOUSEHOLD_MEMBER_ADDED = 'household_member_added',
  HOUSEHOLD_MEMBER_REMOVED = 'household_member_removed',

  // System notifications
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_UPDATE = 'system_update',
  SECURITY_ALERT = 'security_alert',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_OVERDUE = 'payment_overdue',
  PAYMENT_RECEIVED = 'payment_received',

  // Announcement notifications
  ANNOUNCEMENT_POSTED = 'announcement_posted',
  ANNOUNCEMENT_UPDATED = 'announcement_updated',
  ANNOUNCEMENT_EMERGENCY = 'announcement_emergency',

  // Election notifications
  ELECTION_STARTED = 'election_started',
  ELECTION_ENDING = 'election_ending',
  ELECTION_RESULTS = 'election_results',
  VOTE_CAST = 'vote_cast',

  // Construction permit notifications
  PERMIT_APPLIED = 'permit_applied',
  PERMIT_APPROVED = 'permit_approved',
  PERMIT_REJECTED = 'permit_rejected',
  PERMIT_EXPIRING = 'permit_expiring',
  PERMIT_INSPECTION = 'permit_inspection',

  // Maintenance notifications
  MAINTENANCE_REQUESTED = 'maintenance_requested',
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  MAINTENANCE_COMPLETED = 'maintenance_completed',

  // Community notifications
  EVENT_INVITATION = 'event_invitation',
  EVENT_REMINDER = 'event_reminder',
  AMENITY_BOOKED = 'amenity_booked',
  AMENITY_REMINDER = 'amenity_reminder',

  // Security notifications
  SECURITY_INCIDENT = 'security_incident',
  ACCESS_DENIED = 'access_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // Compliance notifications
  COMPLIANCE_REQUIRED = 'compliance_required',
  COMPLIANCE_OVERDUE = 'compliance_overdue',
  COMPLIANCE_APPROVED = 'compliance_approved',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
  PUSH = 'push',
  WEBHOOK = 'webhook',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('notifications')
@Index(['tenant_id', 'status'])
@Index(['recipient_id', 'status'])
@Index(['type', 'created_at'])
@Index(['priority', 'status'])
export class NotificationEntity extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.NORMAL })
  priority: NotificationPriority;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient_email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recipient_phone: string;

  @Column({ type: 'uuid', nullable: true })
  recipient_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  household_id: string;

  @ManyToOne(() => HouseholdEntity, { nullable: true })
  @JoinColumn({ name: 'household_id' })
  household: HouseholdEntity;

  @Column({ type: 'uuid', nullable: true })
  sender_id: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender: UserEntity;

  @Column({ type: 'simple-array', default: [] })
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', nullable: true })
  email_template: {
    subject: string;
    template: string;
    variables: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  sms_template: {
    message: string;
    variables: Record<string, any>;
  };

  @Column({ type: 'jsonb', nullable: true })
  webhook_url: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sent_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  delivered_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  read_at: Date;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Column({ type: 'integer', default: 3 })
  max_retries: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  next_retry_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'jsonb', nullable: true })
  delivery_response: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  is_scheduled: boolean;

  @Column({ type: 'boolean', default: false })
  is_recurring: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recurring_pattern: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    end_date?: Date;
  };

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Virtual properties
  get is_pending(): boolean {
    return this.status === NotificationStatus.PENDING;
  }

  get is_sent(): boolean {
    return this.status === NotificationStatus.SENT;
  }

  get is_delivered(): boolean {
    return this.status === NotificationStatus.DELIVERED;
  }

  get is_failed(): boolean {
    return this.status === NotificationStatus.FAILED;
  }

  get is_expired(): boolean {
    return this.expires_at && new Date() > this.expires_at;
  }

  get can_retry(): boolean {
    return (
      this.is_failed &&
      this.retry_count < this.max_retries &&
      (!this.next_retry_at || new Date() >= this.next_retry_at)
    );
  }

  get is_high_priority(): boolean {
    return [NotificationPriority.HIGH, NotificationPriority.URGENT].includes(this.priority);
  }

  get delivery_time_ms(): number {
    if (this.sent_at && this.delivered_at) {
      return this.delivered_at.getTime() - this.sent_at.getTime();
    }
    return 0;
  }

  get read_time_ms(): number {
    if (this.delivered_at && this.read_at) {
      return this.read_at.getTime() - this.delivered_at.getTime();
    }
    return 0;
  }

  get is_email_enabled(): boolean {
    return this.channels.includes(NotificationChannel.EMAIL) && !!this.recipient_email;
  }

  get is_sms_enabled(): boolean {
    return this.channels.includes(NotificationChannel.SMS) && !!this.recipient_phone;
  }

  get is_push_enabled(): boolean {
    return this.channels.includes(NotificationChannel.PUSH) && !!this.recipient_id;
  }

  get is_webhook_enabled(): boolean {
    return this.channels.includes(NotificationChannel.WEBHOOK) && !!this.webhook_url;
  }

  get display_recipient(): string {
    if (this.recipient) {
      return this.recipient.display_name;
    }
    if (this.recipient_email) {
      return this.recipient_email;
    }
    if (this.recipient_phone) {
      return this.recipient_phone;
    }
    return 'Unknown';
  }

  get display_status(): string {
    switch (this.status) {
      case NotificationStatus.PENDING:
        return this.is_scheduled ? 'Scheduled' : 'Pending';
      case NotificationStatus.SENT:
        return 'Sent';
      case NotificationStatus.DELIVERED:
        return 'Delivered';
      case NotificationStatus.READ:
        return 'Read';
      case NotificationStatus.FAILED:
        return 'Failed';
      case NotificationStatus.CANCELLED:
        return 'Cancelled';
      default:
        return this.status;
    }
  }

  get status_color(): string {
    switch (this.status) {
      case NotificationStatus.PENDING:
        return 'orange';
      case NotificationStatus.SENT:
        return 'blue';
      case NotificationStatus.DELIVERED:
        return 'green';
      case NotificationStatus.READ:
        return 'green';
      case NotificationStatus.FAILED:
        return 'red';
      case NotificationStatus.CANCELLED:
        return 'gray';
      default:
        return 'gray';
    }
  }

  get priority_color(): string {
    switch (this.priority) {
      case NotificationPriority.LOW:
        return 'gray';
      case NotificationPriority.NORMAL:
        return 'blue';
      case NotificationPriority.HIGH:
        return 'orange';
      case NotificationPriority.URGENT:
        return 'red';
      default:
        return 'gray';
    }
  }

  get type_display(): string {
    return this.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  markAsRead(): void {
    this.is_read = true;
    this.status = NotificationStatus.READ;
    this.read_at = new Date();
  }

  markAsDelivered(): void {
    this.status = NotificationStatus.DELIVERED;
    this.delivered_at = new Date();
  }

  markAsFailed(error: string): void {
    this.status = NotificationStatus.FAILED;
    this.error_message = error;
    this.retry_count += 1;

    // Calculate next retry time (exponential backoff)
    const delay = Math.pow(2, this.retry_count) * 60000; // 1min, 2min, 4min, etc.
    this.next_retry_at = new Date(Date.now() + delay);
  }

  scheduleFor(date: Date): void {
    this.is_scheduled = true;
    this.scheduled_at = date;
    this.status = NotificationStatus.PENDING;
  }

  cancel(): void {
    this.status = NotificationStatus.CANCELLED;
  }

  extendExpiry(hours: number): void {
    const currentExpiry = this.expires_at || new Date();
    this.expires_at = new Date(currentExpiry.getTime() + (hours * 60 * 60 * 1000));
  }

  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  // Static methods for common notification types
  static createGuestNotification(
    type: NotificationType,
    guestData: any,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL],
  ): Partial<NotificationEntity> {
    const messages = {
      [NotificationType.GUEST_CREATED]: {
        title: 'Guest Registration Received',
        message: `A new guest ${guestData.guest_name} has been registered for your household.`,
      },
      [NotificationType.GUEST_APPROVED]: {
        title: 'Guest Registration Approved',
        message: `Your guest ${guestData.guest_name} has been approved for visit.`,
      },
      [NotificationType.GUEST_REJECTED]: {
        title: 'Guest Registration Rejected',
        message: `Your guest ${guestData.guest_name} registration has been rejected.`,
      },
      [NotificationType.GUEST_CHECKED_IN]: {
        title: 'Guest Checked In',
        message: `Guest ${guestData.guest_name} has checked in.`,
      },
      [NotificationType.GUEST_CHECKED_OUT]: {
        title: 'Guest Checked Out',
        message: `Guest ${guestData.guest_name} has checked out.`,
      },
    };

    const template = messages[type];
    return {
      type,
      title: template.title,
      message: template.message,
      data: guestData,
      channels,
      priority: NotificationPriority.NORMAL,
    };
  }

  static createSecurityNotification(
    type: NotificationType,
    data: any,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.SMS],
  ): Partial<NotificationEntity> {
    return {
      type,
      title: 'Security Alert',
      message: data.message || 'A security event has occurred.',
      data,
      channels,
      priority: NotificationPriority.HIGH,
    };
  }

  static createSystemNotification(
    type: NotificationType,
    data: any,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
  ): Partial<NotificationEntity> {
    return {
      type,
      title: data.title || 'System Notification',
      message: data.message || 'A system event has occurred.',
      data,
      channels,
      priority: NotificationPriority.NORMAL,
    };
  }
}