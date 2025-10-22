import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { HouseholdEntity } from '../../households/entities/household.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { GuestStatus } from '@hoa-platform/shared';
import { GatePassEntity } from '../../gate-passes/entities/gate-pass.entity';

@Entity('guests')
export class GuestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  household_id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  purpose?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ nullable: true })
  vehicle_make?: string;

  @Column({ nullable: true })
  vehicle_model?: string;

  @Column({ nullable: true })
  vehicle_color?: string;

  @Column({ nullable: true })
  license_plate?: string;

  @Column({ nullable: true })
  expected_arrival?: Date;

  @Column({ nullable: true })
  expected_departure?: Date;

  @Column({ nullable: true })
  max_visitors?: number;

  @Column({
    type: 'enum',
    enum: GuestStatus,
    default: GuestStatus.PENDING,
  })
  status: GuestStatus;

  @Column({ nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at?: Date;

  @Column({ nullable: true })
  rejection_reason?: string;

  @Column({ nullable: true })
  access_code?: string; // For gate access verification

  @Column({ default: false })
  requires_escort?: boolean;

  @Column({ default: false })
  is_recurring?: boolean;

  @Column({ nullable: true })
  recurring_end_date?: Date;

  @Column({ default: false })
  send_notifications: boolean;

  @Column({
    type: 'jsonb',
    default: [],
  })
  notification_emails?: string[];

  @Column({ nullable: true })
  special_instructions?: string;

  @Column({ default: false })
  is_blacklisted?: boolean;

  @Column({ nullable: true })
  blacklist_reason?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checked_in_at?: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checked_out_at?: Date;

  @Column({ default: 0 })
  visit_count?: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  last_updated_by?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => HouseholdEntity, household => household.id, { eager: false })
  @JoinColumn({ name: 'household_id' })
  household: HouseholdEntity;

  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({ name: 'approved_by' })
  approver?: UserEntity;

  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({ name: 'last_updated_by' })
  last_updated_by_user?: UserEntity;

  @OneToMany('GuestAccessLog', 'guest')
  access_logs: any[];

  @OneToMany(() => GatePassEntity, 'gatePass')
  gate_passes: GatePassEntity[];

  // Virtual properties
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  get display_name(): string {
    if (this.company) {
      return `${this.full_name} (${this.company})`;
    }
    return this.full_name;
  }

  get is_approved(): boolean {
    return this.status === GuestStatus.APPROVED;
  }

  get is_pending(): boolean {
    return this.status === GuestStatus.PENDING;
  }

  is_rejected(): boolean {
    return this.status === GuestStatus.REJECTED;
  }

  get is_checked_in(): boolean {
    return this.status === GuestStatus.CHECKED_IN;
  }

  get is_active(): boolean {
    const now = new Date();

    // Check if guest is approved
    if (!this.is_approved) {
      return false;
    }

    // Check if within expected time window
    if (this.expected_arrival && this.expected_departure) {
      return now >= this.expected_arrival && now <= this.expected_departure;
    }

    // If no time constraints, consider active
    return true;
  }

  get is_expired(): boolean {
    if (!this.expected_departure) return false;
    return new Date() > this.expected_departure;
  }

  get time_until_arrival(): number | null {
    if (!this.expected_arrival) return null;
    const now = new Date();
    const diff = this.expected_arrival.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60)); // Hours
  }

  get time_until_departure(): number | null {
    if (!this.expected_departure) return null;
    const now = new Date();
    const diff = this.expected_departure.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60)); // Hours
  }

  get visit_duration_hours(): number | null {
    if (!this.expected_arrival || !this.checked_in_at) return null;

    let departureTime = this.expected_departure;
    if (this.checked_out_at) {
      departureTime = this.checked_out_at;
    } else if (this.is_expired) {
      departureTime = this.expected_departure;
    } else {
      departureTime = new Date();
    }

    return Math.ceil((departureTime.getTime() - this.checked_in_at.getTime()) / (1000 * 60 * 60));
  }

  get has_vehicle(): boolean {
    return !!(this.vehicle_make || this.vehicle_model || this.license_plate);
  }

  get vehicle_display(): string {
    if (this.vehicle_make && this.vehicle_model) {
      let vehicle = `${this.vehicle_make} ${this.vehicle_model}`;
      if (this.license_plate) {
        vehicle += ` (${this.license_plate})`;
      }
      if (this.vehicle_color) {
        vehicle += ` - ${this.vehicle_color}`;
      }
      return vehicle;
    }
    return 'No vehicle';
  }

  get access_level(): string {
    if (this.is_blacklisted) return 'Denied - Blacklisted';
    if (this.requires_escort) return 'Escort Required';
    if (this.is_recurring) return 'Recurring Visitor';
    if (this.has_vehicle) return 'Vehicle Access';
    return 'Pedestrian Access';
  }

  get requires_gate_pass(): boolean {
    return this.has_vehicle || this.requires_escort;
  }

  get can_extend(): boolean {
    return this.is_approved && this.expected_departure && this.is_expired;
  }
}