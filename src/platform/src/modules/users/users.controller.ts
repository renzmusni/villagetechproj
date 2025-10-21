import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  SearchUsersDto,
  ChangePasswordDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createUserDto: CreateUserDto): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      data: user,
      message: 'User created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchUsersDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.usersService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('statistics')
  @TenantRequired()
  @ApiOperation({ summary: 'Get user statistics for current tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.usersService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const user = await this.usersService.findOne(currentUser.sub);
    return {
      success: true,
      data: user,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.findOne(id);
    return {
      success: true,
      data: user,
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update user information' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Post(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.activate(id);
    return {
      success: true,
      data: user,
      message: 'User activated successfully',
    };
  }

  @Post(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const user = await this.usersService.deactivate(id);
    return {
      success: true,
      data: user,
      message: 'User deactivated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.usersService.remove(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto<void>> {
    const currentUser = req.user as JwtPayload;
    await this.usersService.changePassword(currentUser.sub, changePasswordDto);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}