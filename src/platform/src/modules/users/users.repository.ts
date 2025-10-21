import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, SelectQueryBuilder } from 'typeorm';
import { UserEntity, UserRole } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, SearchUsersDto, ChangePasswordDto } from '@hoa-platform/shared';
import { ConflictError, NotFoundError, ValidationError, AuthenticationError } from '@hoa-platform/shared';
import { SecurityUtils, ValidationUtils } from '@hoa-platform/shared';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Validate input
    if (!ValidationUtils.isValidEmail(createUserDto.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!ValidationUtils.isValidPassword(createUserDto.password)) {
      throw new ValidationError('Password does not meet security requirements');
    }

    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists', {
        email: createUserDto.email,
      });
    }

    // Hash password
    const password_hash = await SecurityUtils.hashPassword(createUserDto.password);

    const user = this.usersRepository.create({
      ...createUserDto,
      password_hash,
      is_active: true,
    });

    // Don't return password hash
    delete user.password_hash;
    return await this.usersRepository.save(user);
  }

  async findAll(options: SearchUsersDto = {}, tenantId?: string): Promise<{
    users: UserEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, role, is_active } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('1=1');

    // Add tenant filtering for tenant-specific searches
    if (tenantId) {
      queryBuilder.andWhere('user.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (typeof is_active === 'boolean') {
      queryBuilder.andWhere('user.is_active = :isActive', { isActive: is_active });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Remove password hashes from results
    users.forEach(user => delete user.password_hash);

    return {
      users,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, includePassword = false): Promise<UserEntity> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.id = :id', { id });

    if (includePassword) {
      queryBuilder.addSelect('user.password_hash');
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundError('User', id);
    }

    if (!includePassword) {
      delete user.password_hash;
    }

    return user;
  }

  async findByEmail(email: string, includePassword = false): Promise<UserEntity> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .where('user.email = :email', { email });

    if (includePassword) {
      queryBuilder.addSelect('user.password_hash');
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundError('User with email', email);
    }

    if (!includePassword) {
      delete user.password_hash;
    }

    return user;
  }

  async findByTenant(tenantId: string, options: SearchUsersDto = {}): Promise<{
    users: UserEntity[];
    total: number;
  }> {
    const { search, role, is_active } = options;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .where('user.tenant_id = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (typeof is_active === 'boolean') {
      queryBuilder.andWhere('user.is_active = :isActive', { isActive: is_active });
    }

    const [users, total] = await queryBuilder
      .orderBy('user.created_at', 'DESC')
      .getManyAndCount();

    // Remove password hashes
    users.forEach(user => delete user.password_hash);

    return { users, total };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    // Check if email is being changed and if it conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      if (!ValidationUtils.isValidEmail(updateUserDto.email)) {
        throw new ValidationError('Invalid email format');
      }

      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists', {
          email: updateUserDto.email,
        });
      }
    }

    Object.assign(user, updateUserDto);
    await this.usersRepository.save(user);

    // Return user without password hash
    delete user.password_hash;
    return user;
  }

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    if (!ValidationUtils.isValidPassword(newPassword)) {
      throw new ValidationError('New password does not meet security requirements');
    }

    const user = await this.findOne(id, true); // Include password hash

    // Verify current password
    const isCurrentPasswordValid = await SecurityUtils.comparePassword(
      currentPassword,
      user.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash and update new password
    const newPasswordHash = await SecurityUtils.hashPassword(newPassword);
    await this.usersRepository.update(id, {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    });
  }

  async enableMFA(id: string, secret: string): Promise<void> {
    await this.usersRepository.update(id, {
      mfa_enabled: true,
      mfa_secret: secret,
      updated_at: new Date(),
    });
  }

  async disableMFA(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      mfa_enabled: false,
      mfa_secret: null,
      updated_at: new Date(),
    });
  }

  async activate(id: string): Promise<UserEntity> {
    const user = await this.findOne(id);
    user.is_active = true;
    await this.usersRepository.save(user);
    return user;
  }

  async deactivate(id: string): Promise<UserEntity> {
    const user = await this.findOne(id);
    user.is_active = false;
    await this.usersRepository.save(user);
    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async validateCredentials(email: string, password: string): Promise<UserEntity | null> {
    try {
      const user = await this.findByEmail(email, true);

      if (!user.is_active) {
        return null;
      }

      const isPasswordValid = await SecurityUtils.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        return null;
      }

      // Remove password hash before returning
      delete user.password_hash;
      return user;
    } catch {
      return null;
    }
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_role: Record<UserRole, number>;
    mfa_enabled: number;
  }> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (tenantId) {
      queryBuilder.where('user.tenant_id = :tenantId', { tenantId });
    }

    const [
      total,
      active,
      inactive,
      mfaEnabled,
      roleStats,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('user.is_active = true').getCount(),
      queryBuilder.clone().andWhere('user.is_active = false').getCount(),
      queryBuilder.clone().andWhere('user.mfa_enabled = true').getCount(),
      queryBuilder
        .clone()
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany(),
    ]);

    const by_role = roleStats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, {} as Record<UserRole, number>);

    return {
      total,
      active,
      inactive,
      by_role,
      mfa_enabled: mfaEnabled,
    };
  }
}