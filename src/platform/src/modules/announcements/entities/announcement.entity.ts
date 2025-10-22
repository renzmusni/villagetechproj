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

export enum AnnouncementType {
  GENERAL = 'general',
  EMERGENCY = 'emergency',
  MAINTENANCE = 'maintenance',
  EVENT = 'event',
  POLICY = 'policy',
  MEETING = 'meeting',
  CONSTRUCTION = 'construction',
  SAFETY = 'safety',
  WEATHER = 'weather',
  UTILITY = 'utility',
  COMMUNITY = 'community',
  RULES = 'rules',
  AMENITIES = 'amenities',
  FEES = 'fees',
  VOTING = 'voting',
  SERVICE = 'service',
  HOLIDAY = 'holiday',
  OTHER = 'other',
}

export enum AnnouncementPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum AnnouncementStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled',
}

export enum AnnouncementAudience {
  ALL_RESIDENTS = 'all_residents',
  BOARD_MEMBERS = 'board_members',
  COMMITTEE_MEMBERS = 'committee_members',
  PROPERTY_OWNERS = 'property_owners',
  TENANTS = 'tenants',
  SPECIFIC_HOUSEHOLDS = 'specific_households',
  SPECIFIC_USERS = 'specific_users',
  ADMIN_STAFF = 'admin_staff',
  SECURITY = 'security',
  MAINTENANCE = 'maintenance',
}

export enum NotificationMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBSITE_BANNER = 'website_banner',
  DIGITAL_DISPLAY = 'digital_display',
  PRINTED_NOTICE = 'printed_notice',
}

@Entity('announcements')
@Index(['tenant_id', 'status'])
@Index(['status', 'published_at'])
@Index(['priority', 'status'])
@Index(['type', 'published_at'])
@Index(['audience', 'status'])
export class AnnouncementEntity extends TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'enum', enum: AnnouncementType })
  type: AnnouncementType;

  @Column({ type: 'enum', enum: AnnouncementPriority, default: AnnouncementPriority.NORMAL })
  priority: AnnouncementPriority;

  @Column({ type: 'enum', enum: AnnouncementStatus, default: AnnouncementStatus.DRAFT })
  status: AnnouncementStatus;

  @Column({ type: 'enum', enum: AnnouncementAudience, default: AnnouncementAudience.ALL_RESIDENTS })
  audience: AnnouncementAudience;

  @Column({ type: 'simple-array', default: [] })
  notification_methods: NotificationMethod[];

  @Column({ type: 'jsonb', nullable: true })
  targeting: {
    household_ids?: string[];
    user_ids?: string[];
    user_roles?: string[];
    buildings?: string[];
    floors?: string[];
    units?: string[];
    communities?: string[];
    custom_criteria?: Record<string, any>;
  };

  @Column({ type: 'uuid', nullable: true })
  author_id: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'author_id' })
  author: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: UserEntity;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    description?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  media: {
    banner_image?: string;
    thumbnail?: string;
    gallery?: string[];
    videos?: Array<{
      url: string;
      title: string;
      duration?: number;
      thumbnail?: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  call_to_action: {
    text: string;
    url?: string;
    type: 'link' | 'button' | 'form' | 'download';
    target?: '_blank' | '_self';
    tracking_enabled?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  scheduling: {
    publish_date?: Date;
    expire_date?: Date;
    timezone?: string;
    auto_expire?: boolean;
    recurring_pattern?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      days_of_week?: number[];
      day_of_month?: number;
      end_date?: Date;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  display_settings: {
    sticky_until_read?: boolean;
    show_on_login?: boolean;
    show_on_dashboard?: boolean;
    show_in_email_digest?: boolean;
    require_acknowledgment?: boolean;
    allow_comments?: boolean;
    allow_sharing?: boolean;
    show_read_count?: boolean;
    banner_duration?: number; // in hours
  };

  @Column({ type: 'jsonb', nullable: true })
  analytics: {
    views: number;
    unique_views: number;
    reads: number;
    acknowledgments: number;
    shares: number;
    clicks: number;
    email_sents: number;
    email_opens: number;
    email_clicks: number;
    sms_sents: number;
    push_sents: number;
    push_opens: number;
    last_viewed?: Date;
    peak_traffic?: {
      date: Date;
      views: number;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  engagement: {
    likes: number;
    dislikes: number;
    comments: Array<{
      id: string;
      user_id: string;
      user_name: string;
      content: string;
      created_at: Date;
      replies?: Array<{
        id: string;
        user_id: string;
        user_name: string;
        content: string;
        created_at: Date;
      }>;
    }>;
    reactions: Array<{
      type: string;
      count: number;
      users: string[];
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  translations: {
    [language: string]: {
      title: string;
      content: string;
      summary?: string;
      call_to_action?: {
        text: string;
      };
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  categories: string[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  published_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  archived_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_notified_at: Date;

  @Column({ type: 'integer', default: 0 })
  read_count: number;

  @Column({ type: 'integer', default: 0 })
  acknowledgment_count: number;

  @Column({ type: 'integer', default: 0 })
  share_count: number;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'boolean', default: false })
  requires_approval: boolean;

  @Column({ type: 'boolean', default: false })
  is_emergency: boolean;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'boolean', default: false })
  allow_comments: boolean;

  @Column({ type: 'boolean', default: false })
  require_acknowledgment: boolean;

  @Column({ type: 'boolean', default: false })
  send_immediately: boolean;

  @Column({ type: 'boolean', default: false })
  track_engagement: boolean;

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
    return this.status === AnnouncementStatus.DRAFT;
  }

  get is_scheduled(): boolean {
    return this.status === AnnouncementStatus.SCHEDULED;
  }

  get is_published(): boolean {
    return this.status === AnnouncementStatus.PUBLISHED;
  }

  get is_expired(): boolean {
    return this.status === AnnouncementStatus.EXPIRED;
  }

  get is_archived(): boolean {
    return this.status === AnnouncementStatus.ARCHIVED;
  }

  get is_cancelled(): boolean {
    return this.status === AnnouncementStatus.CANCELLED;
  }

  get is_active(): boolean {
    return this.is_published && (!this.expires_at || new Date() <= this.expires_at);
  }

  get can_be_published(): boolean {
    return this.is_draft || this.is_scheduled;
  }

  get can_be_edited(): boolean {
    return [AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED].includes(this.status);
  }

  get needs_approval(): boolean {
    return this.requires_approval && !this.approved_by;
  }

  get is_high_priority(): boolean {
    return [AnnouncementPriority.HIGH, AnnouncementPriority.URGENT, AnnouncementPriority.CRITICAL].includes(this.priority);
  }

  get is_critical_priority(): boolean {
    return this.priority === AnnouncementPriority.CRITICAL;
  }

  get is_visible_to_residents(): boolean {
    return this.is_published && (!this.expires_at || new Date() <= this.expires_at);
  }

  get is_sticky(): boolean {
    return this.is_pinned || this.display_settings?.sticky_until_read;
  }

  get engagement_rate(): number {
    if (!this.analytics?.views) return 0;
    return ((this.analytics.reads + this.analytics.acknowledgments) / this.analytics.views) * 100;
  }

  get total_engagement(): number {
    if (!this.engagement) return 0;
    return this.engagement.likes + this.engagement.dislikes +
           (this.engagement.comments?.length || 0) + this.share_count;
  }

  get has_attachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  get has_media(): boolean {
    return !!(this.media?.banner_image || this.media?.thumbnail ||
             (this.media?.gallery && this.media.gallery.length > 0) ||
             (this.media?.videos && this.media.videos.length > 0));
  }

  get has_call_to_action(): boolean {
    return !!this.call_to_action;
  }

  get is_multilingual(): boolean {
    return this.translations && Object.keys(this.translations).length > 0;
  }

  get display_priority(): string {
    return this.priority.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get priority_color(): string {
    switch (this.priority) {
      case AnnouncementPriority.LOW:
        return 'gray';
      case AnnouncementPriority.NORMAL:
        return 'blue';
      case AnnouncementPriority.HIGH:
        return 'orange';
      case AnnouncementPriority.URGENT:
        return 'red';
      case AnnouncementPriority.CRITICAL:
        return 'purple';
      default:
        return 'gray';
    }
  }

  get display_status(): string {
    return this.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get status_color(): string {
    switch (this.status) {
      case AnnouncementStatus.DRAFT:
        return 'gray';
      case AnnouncementStatus.SCHEDULED:
        return 'yellow';
      case AnnouncementStatus.PUBLISHED:
        return 'green';
      case AnnouncementStatus.EXPIRED:
        return 'orange';
      case AnnouncementStatus.ARCHIVED:
        return 'gray';
      case AnnouncementStatus.CANCELLED:
        return 'red';
      default:
        return 'gray';
    }
  }

  get display_audience(): string {
    return this.audience.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get display_type(): string {
    return this.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  get content_preview(): string {
    if (!this.content) return '';
    return this.content.length > 150 ? this.content.substring(0, 147) + '...' : this.content;
  }

  get days_until_expiry(): number {
    if (!this.expires_at) return -1;
    const now = new Date();
    const diff = this.expires_at.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get time_since_published(): string {
    if (!this.published_at) return '';
    const now = new Date();
    const diff = now.getTime() - this.published_at.getTime();
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
  publish(): void {
    if (![AnnouncementStatus.DRAFT, AnnouncementStatus.SCHEDULED].includes(this.status)) {
      throw new Error('Announcement must be in draft or scheduled status to publish');
    }

    this.status = AnnouncementStatus.PUBLISHED;
    this.published_at = new Date();

    // Set expiry if scheduled
    if (this.scheduling?.expire_date) {
      this.expires_at = this.scheduling.expire_date;
    }

    // Initialize analytics if not exists
    if (!this.analytics) {
      this.analytics = {
        views: 0,
        unique_views: 0,
        reads: 0,
        acknowledgments: 0,
        shares: 0,
        clicks: 0,
        email_sents: 0,
        email_opens: 0,
        email_clicks: 0,
        sms_sents: 0,
        push_sents: 0,
        push_opens: 0,
      };
    }
  }

  schedule(publishDate: Date, expireDate?: Date): void {
    if (this.status !== AnnouncementStatus.DRAFT) {
      throw new Error('Announcement must be in draft status to schedule');
    }

    this.status = AnnouncementStatus.SCHEDULED;
    this.scheduling = {
      publish_date: publishDate,
      expire_date: expireDate,
      auto_expire: !!expireDate,
    };
  }

  archive(): void {
    if (![AnnouncementStatus.PUBLISHED, AnnouncementStatus.EXPIRED].includes(this.status)) {
      throw new Error('Only published or expired announcements can be archived');
    }

    this.status = AnnouncementStatus.ARCHIVED;
    this.archived_at = new Date();
  }

  cancel(reason: string): void {
    this.status = AnnouncementStatus.CANCELLED;
    this.cancellation_reason = reason;
  }

  expire(): void {
    this.status = AnnouncementStatus.EXPIRED;
  }

  approve(approvedBy: string): void {
    this.approved_by = approvedBy;
  }

  reject(reason: string): void {
    this.rejection_reason = reason;
    this.status = AnnouncementStatus.CANCELLED;
  }

  view(userId?: string): void {
    if (!this.analytics) {
      this.analytics = {
        views: 0,
        unique_views: 0,
        reads: 0,
        acknowledgments: 0,
        shares: 0,
        clicks: 0,
        email_sents: 0,
        email_opens: 0,
        email_clicks: 0,
        sms_sents: 0,
        push_sents: 0,
        push_opens: 0,
      };
    }

    this.analytics.views++;
    this.analytics.unique_views++;
    this.analytics.last_viewed = new Date();

    // Update peak traffic if needed
    if (!this.analytics.peak_traffic || this.analytics.views > this.analytics.peak_traffic.views) {
      this.analytics.peak_traffic = {
        date: new Date(),
        views: this.analytics.views,
      };
    }
  }

  read(userId?: string): void {
    this.view(userId);
    if (this.analytics) {
      this.analytics.reads++;
    }
    this.read_count++;
  }

  acknowledge(userId?: string): void {
    this.read(userId);
    if (this.analytics) {
      this.analytics.acknowledgments++;
    }
    this.acknowledgment_count++;
  }

  share(): void {
    if (this.analytics) {
      this.analytics.shares++;
    }
    this.share_count++;
  }

  click(): void {
    if (this.analytics) {
      this.analytics.clicks++;
    }
  }

  addComment(comment: {
    id: string;
    user_id: string;
    user_name: string;
    content: string;
  }): void {
    if (!this.engagement) {
      this.engagement = {
        likes: 0,
        dislikes: 0,
        comments: [],
        reactions: [],
      };
    }

    this.engagement.comments.push({
      ...comment,
      created_at: new Date(),
      replies: [],
    });
  }

  addReaction(reactionType: string, userId: string): void {
    if (!this.engagement) {
      this.engagement = {
        likes: 0,
        dislikes: 0,
        comments: [],
        reactions: [],
      };
    }

    let reaction = this.engagement.reactions.find(r => r.type === reactionType);
    if (!reaction) {
      reaction = {
        type: reactionType,
        count: 0,
        users: [],
      };
      this.engagement.reactions.push(reaction);
    }

    if (!reaction.users.includes(userId)) {
      reaction.count++;
      reaction.users.push(userId);

      // Update counts
      if (reactionType === 'like') {
        this.engagement.likes++;
      } else if (reactionType === 'dislike') {
        this.engagement.dislikes++;
      }
    }
  }

  pin(): void {
    this.is_pinned = true;
  }

  unpin(): void {
    this.is_pinned = false;
  }

  extendExpiry(newExpiryDate: Date): void {
    this.expires_at = newExpiryDate;
    if (this.scheduling) {
      this.scheduling.expire_date = newExpiryDate;
    }
  }

  // Static factory methods
  static createEmergencyAnnouncement(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    audience?: AnnouncementAudience;
    priority?: AnnouncementPriority;
    targeting?: any;
  }): Partial<AnnouncementEntity> {
    return {
      title: data.title,
      content: data.content,
      type: AnnouncementType.EMERGENCY,
      priority: data.priority || AnnouncementPriority.CRITICAL,
      status: AnnouncementStatus.DRAFT,
      audience: data.audience || AnnouncementAudience.ALL_RESIDENTS,
      author_id: data.author_id,
      tenant_id: data.tenant_id,
      is_emergency: true,
      send_immediately: true,
      notification_methods: [NotificationMethod.EMAIL, NotificationMethod.SMS, NotificationMethod.PUSH, NotificationMethod.IN_APP],
      targeting: data.targeting,
      scheduling: {
        auto_expire: false, // Emergency announcements don't auto-expire
      },
      display_settings: {
        sticky_until_read: true,
        show_on_login: true,
        show_on_dashboard: true,
        require_acknowledgment: true,
        banner_duration: 72, // 3 days for emergency
      },
    };
  }

  static createMaintenanceNotice(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    scheduled_date: Date;
    expected_duration: string;
    affected_areas?: string[];
  }): Partial<AnnouncementEntity> {
    const summary = `Maintenance scheduled for ${scheduled_date.toLocaleDateString()}. Expected duration: ${expected_duration}`;

    return {
      title: data.title,
      content: data.content,
      summary,
      type: AnnouncementType.MAINTENANCE,
      priority: AnnouncementPriority.HIGH,
      status: AnnouncementStatus.DRAFT,
      audience: AnnouncementAudience.ALL_RESIDENTS,
      author_id: data.author_id,
      tenant_id: data.tenant_id,
      scheduling: {
        publish_date: new Date(),
        expire_date: new Date(scheduled_date.getTime() + (24 * 60 * 60 * 1000)), // 1 day after maintenance
        auto_expire: true,
      },
      notification_methods: [NotificationMethod.EMAIL, NotificationMethod.IN_APP],
      tags: ['maintenance', 'scheduled'],
      targeting: {
        ...(data.affected_areas && { buildings: data.affected_areas }),
      },
      display_settings: {
        show_on_dashboard: true,
        show_in_email_digest: true,
      },
    };
  }

  static createEventAnnouncement(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    event_date: Date;
    location: string;
    rsvp_required?: boolean;
    max_attendees?: number;
  }): Partial<AnnouncementEntity> {
    return {
      title: data.title,
      content: data.content,
      type: AnnouncementType.EVENT,
      priority: AnnouncementPriority.NORMAL,
      status: AnnouncementStatus.DRAFT,
      audience: AnnouncementAudience.ALL_RESIDENTS,
      author_id: data.author_id,
      tenant_id: data.tenant_id,
      scheduling: {
        publish_date: new Date(),
        expire_date: new Date(data.event_date.getTime() + (24 * 60 * 60 * 1000)), // 1 day after event
        auto_expire: true,
      },
      notification_methods: [NotificationMethod.EMAIL, NotificationMethod.IN_APP],
      tags: ['event', 'community'],
      call_to_action: {
        text: data.rsvp_required ? 'RSVP Now' : 'Learn More',
        type: 'button',
        tracking_enabled: true,
      },
      categories: ['events', 'community'],
    };
  }
}