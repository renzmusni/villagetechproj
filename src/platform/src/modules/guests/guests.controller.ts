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
import { GuestsService } from './guests.service';
import {
  CreateGuestDto,
  UpdateGuestDto,
  SearchGuestsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Guests')
@Controller('guests')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new guest' })
  @ApiResponse({ status: 201, description: 'Guest successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createGuestDto: CreateGuestDto): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.create(createGuestDto);
    return {
      success: true,
      data: guest,
      message: 'Guest created successfully',
    };
  }

  @Post('pre-register')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Pre-register a guest (requires approval)' })
  @ApiResponse({ status: 201, description: 'Guest pre-registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async preRegister(@Body() createGuestDto: CreateGuestDto): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.preRegisterGuest(createGuestDto);
    return {
      success: true,
      data: guest,
      message: 'Guest pre-registered successfully. Awaiting approval.',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all guests with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Guests retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchGuestsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.guestsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.guests,
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
  @ApiOperation({ summary: 'Get guest statistics for current tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.guestsService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('pending-approvals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get guests pending approval' })
  @ApiResponse({ status: 200, description: 'Pending approvals retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPendingApprovals(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const guests = await this.guestsService.getPendingApprovals(tenantId);
    return {
      success: true,
      data: guests,
    };
  }

  @Get('active-guests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get currently active guests' })
  @ApiResponse({ status: 200, description: 'Active guests retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActiveGuests(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const guests = await this.guestsService.getActiveGuests(tenantId);
    return {
      success: true,
      data: guests,
    };
  }

  @Get('overstaying-guests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get overstaying guests' })
  @ApiResponse({ status: 200, description: 'Overstaying guests retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getOverstayingGuests(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const guests = await this.guestsService.getOverstayingGuests(tenantId);
    return {
      success: true,
      data: guests,
    };
  }

  @Get('expected-arrivals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get expected arrivals for a specific date' })
  @ApiResponse({ status: 200, description: 'Expected arrivals retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getExpectedArrivals(
    @Query('date') date: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const targetDate = date ? new Date(date) : new Date();
    const guests = await this.guestsService.getExpectedArrivals(targetDate, tenantId);
    return {
      success: true,
      data: guests,
    };
  }

  @Get('email/:email')
  @TenantRequired()
  @ApiOperation({ summary: 'Get guest by email' })
  @ApiResponse({ status: 200, description: 'Guest retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async findByEmail(@Param('email') email: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.findByEmail(email);
    return {
      success: true,
      data: guest,
    };
  }

  @Get('phone/:phone')
  @TenantRequired()
  @ApiOperation({ summary: 'Get guest by phone number' })
  @ApiResponse({ status: 200, description: 'Guest retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async findByPhone(@Param('phone') phone: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.findByPhone(phone);
    return {
      success: true,
      data: guest,
    };
  }

  @Get('household/:householdId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get guests by household' })
  @ApiResponse({ status: 200, description: 'Guests retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByHousehold(
    @Param('householdId') householdId: string,
    @Query() searchDto: SearchGuestsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.guestsService.findByHousehold(householdId, searchDto);
    return {
      success: true,
      data: result.guests,
      total: result.total,
    };
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Export guest list' })
  @ApiResponse({ status: 200, description: 'Guest list exported successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async exportGuestList(
    @Query() searchDto: SearchGuestsDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const exportData = await this.guestsService.exportGuestList(tenantId, searchDto);
    return {
      success: true,
      data: exportData,
    };
  }

  @Get('validate-access/:accessCode')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Validate guest access code' })
  @ApiResponse({ status: 200, description: 'Access code validated successfully' })
  @ApiResponse({ status: 404, description: 'Invalid access code' })
  async validateAccessCode(@Param('accessCode') accessCode: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.validateAccessCode(accessCode);
    return {
      success: true,
      data: guest,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get guest by ID' })
  @ApiResponse({ status: 200, description: 'Guest retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.findOne(id);
    return {
      success: true,
      data: guest,
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update guest information' })
  @ApiResponse({ status: 200, description: 'Guest updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async update(
    @Param('id') id: string,
    @Body() updateGuestDto: UpdateGuestDto,
  ): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.update(id, updateGuestDto);
    return {
      success: true,
      data: guest,
      message: 'Guest updated successfully',
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a guest' })
  @ApiResponse({ status: 200, description: 'Guest approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approve(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.approve(id, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Guest approved successfully',
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a guest' })
  @ApiResponse({ status: 200, description: 'Guest rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.reject(id, reason, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Guest rejected successfully',
    };
  }

  @Post(':id/check-in')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a guest' })
  @ApiResponse({ status: 200, description: 'Guest checked in successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async checkIn(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.checkIn(id);
    return {
      success: true,
      data: guest,
      message: 'Guest checked in successfully',
    };
  }

  @Post(':id/check-out')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out a guest' })
  @ApiResponse({ status: 200, description: 'Guest checked out successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async checkOut(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const guest = await this.guestsService.checkOut(id);
    return {
      success: true,
      data: guest,
      message: 'Guest checked out successfully',
    };
  }

  @Post(':id/blacklist')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Blacklist a guest' })
  @ApiResponse({ status: 200, description: 'Guest blacklisted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async blacklist(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.blacklist(id, reason, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Guest blacklisted successfully',
    };
  }

  @Post(':id/remove-blacklist')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove guest from blacklist' })
  @ApiResponse({ status: 200, description: 'Guest removed from blacklist successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async removeFromBlacklist(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.removeFromBlacklist(id, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Guest removed from blacklist successfully',
    };
  }

  @Post(':id/extend-stay')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend guest stay' })
  @ApiResponse({ status: 200, description: 'Guest stay extended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async extendStay(
    @Param('id') id: string,
    @Body('newDepartureDate') newDepartureDate: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.extendGuestStay(id, new Date(newDepartureDate), currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Guest stay extended successfully',
    };
  }

  @Post(':id/add-vehicle')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add vehicle information for guest' })
  @ApiResponse({ status: 200, description: 'Vehicle information added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addVehicle(
    @Param('id') id: string,
    @Body() vehicleInfo: {
      vehicle_make: string;
      vehicle_model: string;
      vehicle_color?: string;
      license_plate: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.addGuestVehicle(id, vehicleInfo, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Vehicle information added successfully',
    };
  }

  @Post(':id/remove-vehicle')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove vehicle information from guest' })
  @ApiResponse({ status: 200, description: 'Vehicle information removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async removeVehicle(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.removeGuestVehicle(id, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Vehicle information removed successfully',
    };
  }

  @Post(':id/regenerate-access-code')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate access code for guest' })
  @ApiResponse({ status: 200, description: 'Access code regenerated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async regenerateAccessCode(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guest = await this.guestsService.regenerateAccessCode(id, currentUser.sub);
    return {
      success: true,
      data: guest,
      message: 'Access code regenerated successfully',
    };
  }

  @Post('bulk-approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve multiple guests' })
  @ApiResponse({ status: 200, description: 'Guests approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async bulkApprove(
    @Body('guestIds') guestIds: string[],
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guests = await this.guestsService.bulkApprove(guestIds, currentUser.sub);
    return {
      success: true,
      data: guests,
      message: `${guests.length} guests approved successfully`,
    };
  }

  @Post('bulk-reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk reject multiple guests' })
  @ApiResponse({ status: 200, description: 'Guests rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async bulkReject(
    @Body('guestIds') guestIds: string[],
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const guests = await this.guestsService.bulkReject(guestIds, reason, currentUser.sub);
    return {
      success: true,
      data: guests,
      message: `${guests.length} guests rejected successfully`,
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a guest' })
  @ApiResponse({ status: 200, description: 'Guest deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.guestsService.remove(id);
    return {
      success: true,
      message: 'Guest deleted successfully',
    };
  }
}