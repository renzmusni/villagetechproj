import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { HouseholdEntity } from '../../households/entities/household.entity';

@Entity('vehicles')
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  household_id: string;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ nullable: true })
  color?: string;

  @Column({ unique: true })
  license_plate: string;

  @Column({
    type: 'enum',
    enum: ['sedan', 'suv', 'truck', 'motorcycle', 'van', 'bus', 'electric', 'hybrid', 'other'],
    default: 'sedan',
  })
  vehicle_type: string;

  @Column({
    type: 'enum',
    enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'other'],
    default: 'gasoline',
  })
  fuel_type: string;

  @Column({ nullable: true })
  vin?: string; // Vehicle Identification Number

  @Column({ nullable: true })
  registration_expiry?: Date;

  @Column({ nullable: true })
  insurance_expiry?: Date;

  @Column({ nullable: true })
  notes?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_commercial: boolean;

  @Column({ nullable: true })
  company_name?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => HouseholdEntity, household => household.id)
  household: HouseholdEntity;

  // Virtual properties
  get display_name(): string {
    return `${this.year} ${this.make} ${this.model}`;
  }

  get is_registration_expired(): boolean {
    if (!this.registration_expiry) return false;
    return new Date() > this.registration_expiry;
  }

  get is_insurance_expired(): boolean {
    if (!this.insurance_expiry) return false;
    return new Date() > this.insurance_expiry;
  }

  get needs_attention(): boolean {
    return this.is_registration_expired || this.is_insurance_expired;
  }

  get days_until_registration_expiry(): number {
    if (!this.registration_expiry) return -1;
    const now = new Date();
    const diff = this.registration_expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}