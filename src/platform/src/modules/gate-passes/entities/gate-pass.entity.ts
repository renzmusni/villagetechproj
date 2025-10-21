import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { GatePassType, GatePassStatus } from '@hoa-platform/shared';

@Entity('gate_passes')
export class GatePassEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehicle_id: string;

  @Column({
    type: 'enum',
    enum: GatePassType,
  })
  pass_type: GatePassType;

  @Column({ type: 'timestamp with time zone' })
  start_date: Date;

  @Column({ type: 'timestamp with time zone' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.ACTIVE,
  })
  status: GatePassStatus;

  @Column({ nullable: true })
  qr_code?: string;

  @Column({ nullable: true })
  qr_code_data?: string; // Encrypted QR data for security

  @Column({ nullable: true })
  barcode?: string;

  @Column({ nullable: true })
  access_code?: string; // For temporary access codes

  @Column()
  created_by: string;

  @Column({ nullable: true })
  approved_by?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at?: Date;

  @Column({ nullable: true })
  notes?: string;

  @Column({ nullable: true })
  purpose?: string;

  @Column({ nullable: true })
  visitor_name?: string; // For visitor passes

  @Column({ nullable: true })
  visitor_phone?: string;

  @Column({ nullable: true })
  visitor_email?: string;

  @Column({ nullable: true })
  expected_arrival?: Date;

  @Column({ nullable: true })
  expected_departure?: Date;

  @Column({ default: false })
  unlimited_access: boolean;

  @Column({ default: 0 })
  max_entries: number; // Maximum number of entries allowed

  @Column({ default: 0 })
  current_entries: number; // Current number of entries used

  @Column({ nullable: true })
  last_used_at?: Date;

  @Column({ nullable: true })
  last_entry_point?: string; // Which gate was last used

  @Column({ default: false })
  is_scannable: boolean;

  @Column({ default: false })
  is_printable: boolean;

  @Column({ default: false })
  send_notifications: boolean;

  @Column({ nullable: true })
  notification_emails?: string[];

  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revoked_at?: Date;

  @Column({ nullable: true })
  revoked_by?: string;

  @Column({ nullable: true })
  revoke_reason?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => VehicleEntity, vehicle => vehicle.id, { eager: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: VehicleEntity;

  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @ManyToOne(() => UserEntity, user => user.id)
  @JoinColumn({ name: 'approved_by' })
  approver?: UserEntity;

  @OneToMany('AccessLog', 'gate_pass')
  access_logs: any[];

  // Virtual properties
  get is_expired(): boolean {
    return new Date() > this.end_date;
  }

  get is_active(): boolean {
    const now = new Date();
    return (
      this.status === GatePassStatus.ACTIVE &&
      now >= this.start_date &&
      now <= this.end_date &&
      !this.is_expired
    );
  }

  get is_valid(): boolean {
    return this.is_active && !this.is_expired && (this.unlimited_access || this.current_entries < this.max_entries);
  }

  get days_until_expiry(): number {
    const now = new Date();
    const diff = this.end_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get entries_remaining(): number {
    if (this.unlimited_access) return -1; // Unlimited
    return Math.max(0, this.max_entries - this.current_entries);
  }

  get display_name(): string {
    if (this.visitor_name) {
      return `${this.visitor_name} - ${this.vehicle?.display_name || 'Unknown Vehicle'}`;
    }
    return this.vehicle?.display_name || 'Unknown Vehicle';
  }

  get is_temporary(): boolean {
    return this.pass_type === GatePassType.TEMPORARY ||
           this.pass_type === GatePassType.VISITOR ||
           this.pass_type === GatePassType.DELIVERY;
  }

  get requires_approval(): boolean {
    return this.pass_type === GatePassType.VISITOR ||
           this.pass_type === GatePassType.CONTRACTOR;
  }

  get access_level(): string {
    switch (this.pass_type) {
      case GatePassType.PERMANENT:
        return 'Full Access';
      case GatePassType.TEMPORARY:
        return 'Temporary Access';
      case GatePassType.VISITOR:
        return 'Visitor Access';
      case GatePassType.DELIVERY:
        return 'Delivery Access';
      case GatePassType.CONTRACTOR:
        return 'Contractor Access';
      default:
        return 'Limited Access';
    }
  }
}