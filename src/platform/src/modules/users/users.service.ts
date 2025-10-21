import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import {
  CreateUserDto,
  UpdateUserDto,
  SearchUsersDto,
  ChangePasswordDto,
  UserEntity,
  JwtPayload,
} from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    return await this.usersRepository.create(createUserDto);
  }

  async findAll(options: SearchUsersDto = {}, tenantId?: string): Promise<{
    users: UserEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.usersRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<UserEntity> {
    return await this.usersRepository.findOne(id);
  }

  async findByEmail(email: string): Promise<UserEntity> {
    return await this.usersRepository.findByEmail(email);
  }

  @Audit('update', 'user')
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    return await this.usersRepository.update(id, updateUserDto);
  }

  @Audit('delete', 'user')
  async remove(id: string): Promise<void> {
    return await this.usersRepository.remove(id);
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    return await this.usersRepository.changePassword(id, changePasswordDto);
  }

  async enableMFA(id: string, secret: string): Promise<void> {
    return await this.usersRepository.enableMFA(id, secret);
  }

  async disableMFA(id: string): Promise<void> {
    return await this.usersRepository.disableMFA(id);
  }

  async activate(id: string): Promise<UserEntity> {
    return await this.usersRepository.activate(id);
  }

  async deactivate(id: string): Promise<UserEntity> {
    return await this.usersRepository.deactivate(id);
  }

  async validateCredentials(email: string, password: string): Promise<UserEntity | null> {
    return await this.usersRepository.validateCredentials(email, password);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<UserEntity | null> {
    try {
      const user = await this.usersRepository.findOne(payload.sub);
      if (!user || !user.is_active) {
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_role: Record<string, number>;
    mfa_enabled: number;
  }> {
    return await this.usersRepository.getStatistics(tenantId);
  }

  async findByTenant(tenantId: string, options: SearchUsersDto = {}): Promise<{
    users: UserEntity[];
    total: number;
  }> {
    return await this.usersRepository.findByTenant(tenantId, options);
  }
}