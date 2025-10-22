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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConstructionPermitsService } from './construction-permits.service';
import {
  CreatePermitDto,
  UpdatePermitDto,
  SearchPermitsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
  PermitType,
  InspectionType,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Construction Permits')
@Controller('construction-permits')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ConstructionPermitsController {
  constructor(private readonly permitsService: ConstructionPermitsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new construction permit' })
  @ApiResponse({ status: 201, description: 'Permit created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createPermitDto: CreatePermitDto): Promise<ApiResponseDto<any>> {
    const permit = await this.permitsService.create(createPermitDto);
    return {
      success: true,
      data: permit,
      message: 'Construction permit created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all construction permits with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchPermitsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.permitsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.permits,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get construction permit statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.permitsService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('pending-approvals')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get permits pending approval' })
  @ApiResponse({ status: 200, description: 'Pending approvals retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPendingApprovals(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const permits = await this.permitsService.getPendingApprovals(tenantId);
    return {
      success: true,
      data: permits,
    };
  }

  @Get('active-permits')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get currently active permits' })
  @ApiResponse({ status: 200, description: 'Active permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActivePermits(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const permits = await this.permitsService.getActivePermits(tenantId);
    return {
      success: true,
      data: permits,
    };
  }

  @Get('overdue-permits')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get overdue permits' })
  @ApiResponse({ status: 200, description: 'Overdue permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getOverduePermits(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const permits = await this.permitsService.getOverduePermits(tenantId);
    return {
      success: true,
      data: permits,
    };
  }

  @Get('expiring-permits')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get permits expiring soon' })
  @ApiResponse({ status: 200, description: 'Expiring permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getExpiringPermits(
    @Query('days') days: number = 30,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const permits = await this.permitsService.getExpiringPermits(tenantId, days);
    return {
      success: true,
      data: permits,
    };
  }

  @Get('inspection-required')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Get permits requiring inspection' })
  @ApiResponse({ status: 200, description: 'Permits requiring inspection retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPermitsRequiringInspection(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const permits = await this.permitsService.getPermitsRequiringInspection(tenantId);
    return {
      success: true,
      data: permits,
    };
  }

  @Get('household/:householdId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get permits by household' })
  @ApiResponse({ status: 200, description: 'Household permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByHousehold(
    @Param('householdId') householdId: string,
    @Query() searchDto: SearchPermitsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.permitsService.findByHousehold(householdId, searchDto);
    return {
      success: true,
      data: result.permits,
      total: result.total,
    };
  }

  @Get('contractor/:contractorId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get permits by contractor' })
  @ApiResponse({ status: 200, description: 'Contractor permits retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByContractor(
    @Param('contractorId') contractorId: string,
    @Query() searchDto: SearchPermitsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.permitsService.findByContractor(contractorId, searchDto);
    return {
      success: true,
      data: result.permits,
      total: result.total,
    };
  }

  @Get('number/:permitNumber')
  @TenantRequired()
  @ApiOperation({ summary: 'Get permit by permit number' })
  @ApiResponse({ status: 200, description: 'Permit retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Permit not found' })
  async findByPermitNumber(@Param('permitNumber') permitNumber: string): Promise<ApiResponseDto<any>> {
    const permit = await this.permitsService.findByPermitNumber(permitNumber);
    return {
      success: true,
      data: permit,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get permit by ID' })
  @ApiResponse({ status: 200, description: 'Permit retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Permit not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const permit = await this.permitsService.findOne(id);
    return {
      success: true,
      data: permit,
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update permit information' })
  @ApiResponse({ status: 200, description: 'Permit updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Permit not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePermitDto: UpdatePermitDto,
  ): Promise<ApiResponseDto<any>> {
    const permit = await this.permitsService.update(id, updatePermitDto);
    return {
      success: true,
      data: permit,
      message: 'Permit updated successfully',
    };
  }

  @Post(':id/submit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit permit for review' })
  @ApiResponse({ status: 200, description: 'Permit submitted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async submitForReview(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.submitForReview(id, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Permit submitted for review successfully',
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a permit' })
  @ApiResponse({ status: 200, description: 'Permit approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approve(
    @Param('id') id: string,
    @Body('conditions') conditions?: string[],
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.approvePermit(id, currentUser.sub, conditions);
    return {
      success: true,
      data: permit,
      message: 'Permit approved successfully',
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a permit' })
  @ApiResponse({ status: 200, description: 'Permit rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.rejectPermit(id, reason, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Permit rejected successfully',
    };
  }

  @Post(':id/issue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a permit' })
  @ApiResponse({ status: 200, description: 'Permit issued successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async issue(
    @Param('id') id: string,
    @Body() permitConditions?: any,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.issuePermit(id, currentUser.sub, permitConditions);
    return {
      success: true,
      data: permit,
      message: 'Permit issued successfully',
    };
  }

  @Post(':id/start-work')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start construction work' })
  @ApiResponse({ status: 200, description: 'Work started successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async startWork(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.startWork(id, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Construction work started successfully',
    };
  }

  @Post(':id/complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete construction project' })
  @ApiResponse({ status: 200, description: 'Project completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async complete(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.completePermit(id, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Construction project completed successfully',
    };
  }

  @Post(':id/schedule-inspection')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection scheduled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async scheduleInspection(
    @Param('id') id: string,
    @Body() inspectionData: {
      type: InspectionType;
      scheduled_date: string;
      inspector_id: string;
      comments?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.scheduleInspection(id, {
      ...inspectionData,
      scheduled_date: new Date(inspectionData.scheduled_date),
    }, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Inspection scheduled successfully',
    };
  }

  @Post(':id/complete-inspection')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an inspection' })
  @ApiResponse({ status: 200, description: 'Inspection completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async completeInspection(
    @Param('id') id: string,
    @Body() inspectionResult: {
      inspection_id: string;
      status: 'passed' | 'failed';
      comments: string;
      photos?: string[];
      next_inspection?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.completeInspection(
      id,
      inspectionResult.inspection_id,
      {
        status: inspectionResult.status,
        comments: inspectionResult.comments,
        photos: inspectionResult.photos,
        next_inspection: inspectionResult.next_inspection,
      },
      currentUser.sub,
    );
    return {
      success: true,
      data: permit,
      message: 'Inspection completed successfully',
    };
  }

  @Post(':id/add-violation')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a violation' })
  @ApiResponse({ status: 200, description: 'Violation added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addViolation(
    @Param('id') id: string,
    @Body() violationData: {
      type: string;
      description: string;
      severity: 'minor' | 'major' | 'critical';
      fine?: number;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.addViolation(id, violationData, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Violation added successfully',
    };
  }

  @Post(':id/resolve-violation')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a violation' })
  @ApiResponse({ status: 200, description: 'Violation resolved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async resolveViolation(
    @Param('id') id: string,
    @Body('violation_id') violationId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.resolveViolation(id, violationId, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Violation resolved successfully',
    };
  }

  @Post(':id/add-progress')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add progress update' })
  @ApiResponse({ status: 200, description: 'Progress update added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addProgressUpdate(
    @Param('id') id: string,
    @Body() updateData: {
      completion_percentage: number;
      description: string;
      photos?: string[];
      issues?: string[];
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.addProgressUpdate(id, updateData, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Progress update added successfully',
    };
  }

  @Post(':id/extend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend permit expiration' })
  @ApiResponse({ status: 200, description: 'Permit extended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async extendPermit(
    @Param('id') id: string,
    @Body() extensionData: {
      new_expiry_date: string;
      reason: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.extendPermit(
      id,
      new Date(extensionData.new_expiry_date),
      extensionData.reason,
      currentUser.sub,
    );
    return {
      success: true,
      data: permit,
      message: 'Permit extended successfully',
    };
  }

  @Post(':id/add-change-order')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a change order' })
  @ApiResponse({ status: 200, description: 'Change order added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addChangeOrder(
    @Param('id') id: string,
    @Body() changeOrderData: {
      description: string;
      cost_change: number;
      duration_change: number;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.addChangeOrder(id, changeOrderData, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Change order added successfully',
    };
  }

  @Post(':id/approve-change-order')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a change order' })
  @ApiResponse({ status: 200, description: 'Change order approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approveChangeOrder(
    @Param('id') id: string,
    @Body('change_order_id') changeOrderId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.approveChangeOrder(id, changeOrderId, currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Change order approved successfully',
    };
  }

  @Post(':id/upload-documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload permit documents' })
  @ApiResponse({ status: 200, description: 'Documents uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async uploadDocuments(
    @Param('id') id: string,
    @Body() documentData: {
      type: string;
      file_url: string;
      file_name: string;
      file_size: number;
      description?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const permit = await this.permitsService.uploadDocuments(id, [documentData], currentUser.sub);
    return {
      success: true,
      data: permit,
      message: 'Document uploaded successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a permit' })
  @ApiResponse({ status: 200, description: 'Permit deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Permit not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.permitsService.remove(id);
    return {
      success: true,
      message: 'Permit deleted successfully',
    };
  }
}