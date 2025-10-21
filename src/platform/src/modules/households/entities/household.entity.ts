import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('households')
export class HouseholdEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  unit_number?: string;

  @Column({ nullable: true })
  building_number?: string;

  @Column({ nullable: true })
  floor?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  head_user_id?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_owner_occupied: boolean;

  @Column({
    type: 'enum',
    enum: ['apartment', 'house', 'condo', 'townhouse', 'villa', 'other'],
    default: 'apartment',
  })
  property_type: string;

  @Column({ nullable: true })
  ownership_type?: string; // 'owned', 'rented', 'company_owned'

  @Column({ default: 0 })
  parking_spaces: number;

  @Column({ default: 0 })
  storage_units: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => UserEntity, user => user.id, { nullable: true })
  head_user?: UserEntity;

  @OneToMany(() => UserEntity, user => user.id)
  members?: UserEntity[];

  // Virtual properties
  get display_address(): string {
    let address = this.address;
    if (this.unit_number) {
      address += `, Unit ${this.unit_number}`;
    }
    return address;
  }

  get full_address(): string {
    let address = this.address;
    if (this.unit_number) {
      address += `, Unit ${this.unit_number}`;
    }
    if (this.building_number) {
      address = `Building ${this.building_number}, ${address}`;
    }
    if (this.floor) {
      address += `, Floor ${this.floor}`;
    }
    return address;
  }
}