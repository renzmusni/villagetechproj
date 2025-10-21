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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  SearchTenantsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { UserRole } from '@hoa-platform/shared';

@ApiTags('Tenants')
@Controller('tenants')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Create a new tenant (HOA community)' })
  @ApiResponse({ status: 201, description: 'Tenant successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.create(createTenantDto);
    return {
      success: true,
      data: tenant,
      message: 'Tenant created successfully',
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get all tenants with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(@Query() searchDto: SearchTenantsDto): Promise<PaginatedResponse<TenantEntity>> {
    const result = await this.tenantsService.findAll(searchDto);
    return {
      success: true,
      data: result.tenants,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get tenant statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(): Promise<ApiResponseDto<any>> {
    const statistics = await this.tenantsService.getStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('subdomain/:subdomain')
  @Public()
  @ApiOperation({ summary: 'Get tenant by subdomain' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findBySubdomain(@Param('subdomain') subdomain: string): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.findBySubdomain(subdomain);
    return {
      success: true,
      data: tenant,
    };
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.findOne(id);
    return {
      success: true,
      data: tenant,
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN)
  @TenantRequired()
  @ApiOperation({ summary: 'Update tenant information' })
  @ApiResponse({ status: 200, description: 'Tenant updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.update(id, updateTenantDto);
    return {
      success: true,
      data: tenant,
      message: 'Tenant updated successfully',
    };
  }

  @Post(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant activated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.activate(id);
    return {
      success: true,
      data: tenant,
      message: 'Tenant activated successfully',
    };
  }

  @Post(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.deactivate(id);
    return {
      success: true,
      data: tenant,
      message: 'Tenant deactivated successfully',
    };
  }

  @Post(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant suspended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<ApiResponseDto<TenantEntity>> {
    const tenant = await this.tenantsService.suspend(id, reason);
    return {
      success: true,
      data: tenant,
      message: 'Tenant suspended successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tenant' })
  @ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.tenantsService.remove(id);
    return {
      success: true,
      message: 'Tenant deleted successfully',
    };
  }
}