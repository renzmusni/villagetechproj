import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@hoa-platform/shared';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.RESIDENT,
  })
  role: UserRole;

  @Column({ default: false })
  mfa_enabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  mfa_secret?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  tenant_id?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Virtual property for full name
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  // Virtual property for display name
  get display_name(): string {
    return this.full_name || this.email;
  }
}