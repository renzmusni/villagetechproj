import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TenantStatus } from '@hoa-platform/shared';

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({
    type: 'jsonb',
    default: {},
  })
  settings: Record<string, any>;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  postal_code?: string;

  @Column({ nullable: true })
  contact_email?: string;

  @Column({ nullable: true })
  contact_phone?: string;

  @Column({ default: 0 })
  max_households: number;

  @Column({ default: 0 })
  current_households: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual properties
  get is_at_capacity(): boolean {
    return this.current_households >= this.max_households;
  }

  get capacity_percentage(): number {
    if (this.max_households === 0) return 0;
    return Math.round((this.current_households / this.max_households) * 100);
  }
}