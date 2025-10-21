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
import { VehiclesService } from './vehicles.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  SearchVehiclesDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createVehicleDto: CreateVehicleDto): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.create(createVehicleDto);
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all vehicles with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchVehiclesDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.vehiclesService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.vehicles,
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
  @ApiOperation({ summary: 'Get vehicle statistics for current tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.vehiclesService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('expiring-registrations')
  @TenantRequired()
  @ApiOperation({ summary: 'Get vehicles with expiring registrations' })
  @ApiResponse({ status: 200, description: 'Expiring registrations retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getExpiringRegistrations(@Query('days') days: number = 30): Promise<ApiResponseDto<any>> {
    const vehicles = await this.vehiclesService.findExpiringRegistrations(days);
    return {
      success: true,
      data: vehicles,
    };
  }

  @Get('expiring-insurance')
  @TenantRequired()
  @ApiOperation({ summary: 'Get vehicles with expiring insurance' })
  @ApiResponse({ status: 200, description: 'Expiring insurance retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getExpiringInsurance(@Query('days') days: number = 30): Promise<ApiResponseDto<any>> {
    const vehicles = await this.vehiclesService.findExpiringInsurance(days);
    return {
      success: true,
      data: vehicles,
    };
  }

  @Get('license-plate/:licensePlate')
  @TenantRequired()
  @ApiOperation({ summary: 'Get vehicle by license plate' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findByLicensePlate(@Param('licensePlate') licensePlate: string): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.findByLicensePlate(licensePlate);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Get('household/:householdId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get vehicles by household' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByHousehold(
    @Param('householdId') householdId: string,
    @Query() searchDto: SearchVehiclesDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.vehiclesService.findByHousehold(householdId, searchDto);
    return {
      success: true,
      data: result.vehicles,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.findOne(id);
    return {
      success: true,
      data: vehicle,
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update vehicle information' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.update(id, updateVehicleDto);
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully',
    };
  }

  @Post(':id/activate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle activated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.activate(id);
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle activated successfully',
    };
  }

  @Post(':id/deactivate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.deactivate(id);
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle deactivated successfully',
    };
  }

  @Post(':id/update-registration')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vehicle registration expiry' })
  @ApiResponse({ status: 200, description: 'Registration expiry updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateRegistrationExpiry(
    @Param('id') id: string,
    @Body('expiryDate') expiryDate: string,
  ): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.updateRegistrationExpiry(id, new Date(expiryDate));
    return {
      success: true,
      data: vehicle,
      message: 'Registration expiry updated successfully',
    };
  }

  @Post(':id/update-insurance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vehicle insurance expiry' })
  @ApiResponse({ status: 200, description: 'Insurance expiry updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async updateInsuranceExpiry(
    @Param('id') id: string,
    @Body('expiryDate') expiryDate: string,
  ): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.updateInsuranceExpiry(id, new Date(expiryDate));
    return {
      success: true,
      data: vehicle,
      message: 'Insurance expiry updated successfully',
    };
  }

  @Post(':id/transfer')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer vehicle to another household' })
  @ApiResponse({ status: 200, description: 'Vehicle transferred successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async transferVehicle(
    @Param('id') id: string,
    @Body('newHouseholdId') newHouseholdId: string,
  ): Promise<ApiResponseDto<any>> {
    const vehicle = await this.vehiclesService.transferVehicle(id, newHouseholdId);
    return {
      success: true,
      data: vehicle,
      message: 'Vehicle transferred successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.vehiclesService.remove(id);
    return {
      success: true,
      message: 'Vehicle deleted successfully',
    };
  }
}