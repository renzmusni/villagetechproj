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
import { HouseholdsService } from './households.service';
import {
  CreateHouseholdDto,
  UpdateHouseholdDto,
  SearchHouseholdsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Households')
@Controller('households')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new household' })
  @ApiResponse({ status: 201, description: 'Household successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createHouseholdDto: CreateHouseholdDto): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.create(createHouseholdDto);
    return {
      success: true,
      data: household,
      message: 'Household created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all households with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Households retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchHouseholdsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.householdsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.households,
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
  @ApiOperation({ summary: 'Get household statistics for current tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.householdsService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('my-household')
  @TenantRequired()
  @ApiOperation({ summary: 'Get current user\'s household' })
  @ApiResponse({ status: 200, description: 'Household retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async getMyHousehold(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const household = await this.householdsService.findByHeadUserId(currentUser.sub);

    return {
      success: true,
      data: household,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get household by ID' })
  @ApiResponse({ status: 200, description: 'Household retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.findOne(id);
    return {
      success: true,
      data: household,
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update household information' })
  @ApiResponse({ status: 200, description: 'Household updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async update(
    @Param('id') id: string,
    @Body() updateHouseholdDto: UpdateHouseholdDto,
  ): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.update(id, updateHouseholdDto);
    return {
      success: true,
      data: household,
      message: 'Household updated successfully',
    };
  }

  @Post(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a household' })
  @ApiResponse({ status: 200, description: 'Household activated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.activate(id);
    return {
      success: true,
      data: household,
      message: 'Household activated successfully',
    };
  }

  @Post(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a household' })
  @ApiResponse({ status: 200, description: 'Household deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.deactivate(id);
    return {
      success: true,
      data: household,
      message: 'Household deactivated successfully',
    };
  }

  @Post(':id/assign-head')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign head user to household' })
  @ApiResponse({ status: 200, description: 'Head user assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async assignHeadUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.assignHeadUser(id, userId);
    return {
      success: true,
      data: household,
      message: 'Head user assigned successfully',
    };
  }

  @Post(':id/remove-head')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove head user from household' })
  @ApiResponse({ status: 200, description: 'Head user removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async removeHeadUser(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const household = await this.householdsService.removeHeadUser(id);
    return {
      success: true,
      data: household,
      message: 'Head user removed successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a household' })
  @ApiResponse({ status: 200, description: 'Household deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.householdsService.remove(id);
    return {
      success: true,
      message: 'Household deleted successfully',
    };
  }
}