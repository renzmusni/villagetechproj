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
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GatePassesService } from './gate-passes.service';
import {
  CreateGatePassDto,
  UpdateGatePassDto,
  SearchGatePassesDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';
import { Response } from 'express';

@ApiTags('Gate Passes')
@Controller('gate-passes')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class GatePassesController {
  constructor(private readonly gatePassesService: GatePassesService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.HOUSEHOLD_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new gate pass' })
  @ApiResponse({ status: 201, description: 'Gate pass successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createGatePassDto: CreateGatePassDto): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.create(createGatePassDto);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass created successfully',
    };
  }

  @Post('temporary')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @ApiOperation({ summary: 'Create a temporary gate pass' })
  @ApiResponse({ status: 201, description: 'Temporary gate pass successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createTemporaryPass(
    @Body() body: {
      vehicle_id: string;
      visitor_name: string;
      purpose: string;
      hours?: number;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const gatePass = await this.gatePassesService.createTemporaryPass(
      body.vehicle_id,
      body.visitor_name,
      body.purpose,
      body.hours || 24,
      currentUser.sub,
    );
    return {
      success: true,
      data: gatePass,
      message: 'Temporary gate pass created successfully',
    };
  }

  @Post('visitor')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @ApiOperation({ summary: 'Create a visitor gate pass' })
  @ApiResponse({ status: 201, description: 'Visitor gate pass successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createVisitorPass(
    @Body() body: {
      vehicle_id: string;
      visitor_name: string;
      visitor_phone: string;
      purpose: string;
      expected_arrival: string;
      expected_departure: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const gatePass = await this.gatePassesService.createVisitorPass(
      body.vehicle_id,
      body.visitor_name,
      body.visitor_phone,
      body.purpose,
      new Date(body.expected_arrival),
      new Date(body.expected_departure),
      currentUser.sub,
    );
    return {
      success: true,
      data: gatePass,
      message: 'Visitor gate pass created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all gate passes with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Gate passes retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchGatePassesDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.gatePassesService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.gatePasses,
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
  @ApiOperation({ summary: 'Get gate pass statistics for current tenant' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.gatePassesService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('expiring')
  @TenantRequired()
  @ApiOperation({ summary: 'Get gate passes expiring soon' })
  @ApiResponse({ status: 200, description: 'Expiring gate passes retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getExpiringPasses(@Query('days') days: number = 7): Promise<ApiResponseDto<any>> {
    const gatePasses = await this.gatePassesService.getExpiringPasses(days);
    return {
      success: true,
      data: gatePasses,
    };
  }

  @Get('active-count')
  @TenantRequired()
  @ApiOperation({ summary: 'Get count of active gate passes' })
  @ApiResponse({ status: 200, description: 'Active gate passes count retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActivePassesCount(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const count = await this.gatePassesService.getActivePassesCount(tenantId);
    return {
      success: true,
      data: { count },
    };
  }

  @Get('validate/:qrCode')
  @TenantRequired()
  @ApiOperation({ summary: 'Validate gate pass by QR code' })
  @ApiResponse({ status: 200, description: 'Gate pass validation result' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async validateQRCode(
    @Param('qrCode') qrCode: string,
    @Query('entryPoint') entryPoint: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.gatePassesService.validateAccess(qrCode, entryPoint || 'main_gate');
    return {
      success: true,
      data: result,
    };
  }

  @Get('validate-barcode/:barcode')
  @TenantRequired()
  @ApiOperation({ summary: 'Validate gate pass by barcode' })
  @ApiResponse({ status: 200, description: 'Gate pass validation result' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async validateBarcode(
    @Param('barcode') barcode: string,
    @Query('entryPoint') entryPoint: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.gatePassesService.validateAccessByBarcode(barcode, entryPoint || 'main_gate');
    return {
      success: true,
      data: result,
    };
  }

  @Get('qr/:qrCode')
  @TenantRequired()
  @ApiOperation({ summary: 'Find gate pass by QR code data' })
  @ApiResponse({ status: 200, description: 'Gate pass retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async findByQRCode(@Param('qrCode') qrCode: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.findByQRCode(qrCode);
    if (!gatePass) {
      throw new Error('Gate pass not found');
    }
    return {
      success: true,
      data: gatePass,
    };
  }

  @Get('barcode/:barcode')
  @TenantRequired()
  @ApiOperation({ summary: 'Find gate pass by barcode' })
  @ApiResponse({ status: 200, description: 'Gate pass retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async findByBarcode(@Param('barcode') barcode: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.findByBarcode(barcode);
    if (!gatePass) {
      throw new Error('Gate pass not found');
    }
    return {
      success: true,
      data: gatePass,
    };
  }

  @Get('vehicle/:vehicleId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get gate passes for a vehicle' })
  @ApiResponse({ status: 200, description: 'Gate passes retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByVehicle(
    @Param('vehicleId') vehicleId: string,
    @Query() searchDto: SearchGatePassesDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.gatePassesService.findByVehicle(vehicleId, searchDto);
    return {
      success: true,
      data: result.gatePasses,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get gate pass by ID' })
  @ApiResponse({ status: 200, description: 'Gate pass retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.findOne(id);
    return {
      success: true,
      data: gatePass,
    };
  }

  @Post(':id/activate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a gate pass' })
  @ApiResponse({ status: 200, description: 'Gate pass activated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async activate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.activate(id);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass activated successfully',
    };
  }

  @Post(':id/deactivate')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a gate pass' })
  @ApiResponse({ status: 200, description: 'Gate pass deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.deactivate(id);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass deactivated successfully',
    };
  }

  @Post(':id/revoke')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a gate pass' })
  @ApiResponse({ status: 200, description: 'Gate pass revoked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async revoke(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const gatePass = await this.gatePassesService.revoke(id, currentUser.sub, reason);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass revoked successfully',
    };
  }

  @Post(':id/approve')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a gate pass' })
  @ApiResponse({ status: 200, description: 'Gate pass approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approve(@Param('id') id: string, @Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const gatePass = await this.gatePassesService.approvePass(id, currentUser.sub);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass approved successfully',
    };
  }

  @Post(':id/extend')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend gate pass expiry date' })
  @ApiResponse({ status: 200, description: 'Gate pass extended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async extend(
    @Param('id') id: string,
    @Body('newEndDate') newEndDate: string,
  ): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.extendPass(id, new Date(newEndDate));
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass extended successfully',
    };
  }

  @Post(':id/regenerate-qr')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate QR code for gate pass' })
  @ApiResponse({ status: 200, description: 'QR code regenerated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async regenerateQRCode(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.regenerateQRCode(id);
    return {
      success: true,
      data: gatePass,
      message: 'QR code regenerated successfully',
    };
  }

  @Patch(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Update gate pass information' })
  @ApiResponse({ status: 200, description: 'Gate pass updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async update(
    @Param('id') id: string,
    @Body() updateGatePassDto: UpdateGatePassDto,
  ): Promise<ApiResponseDto<any>> {
    const gatePass = await this.gatePassesService.update(id, updateGatePassDto);
    return {
      success: true,
      data: gatePass,
      message: 'Gate pass updated successfully',
    };
  }

  @Delete(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.PLATFORM_ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.ADMIN_HEAD,
    UserRole.SECURITY_HEAD,
  )
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a gate pass' })
  @ApiResponse({ status: 200, description: 'Gate pass deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.gatePassesService.remove(id);
    return {
      success: true,
      message: 'Gate pass deleted successfully',
    };
  }

  @Get('qr/:id/image')
  @TenantRequired()
  @ApiOperation({ summary: 'Get QR code image for gate pass' })
  @ApiResponse({ status: 200, description: 'QR code image returned successfully' })
  @ApiResponse({ status: 404, description: 'Gate pass not found' })
  async getQRCodeImage(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const gatePass = await this.gatePassesService.findOne(id);

    if (!gatePass || !gatePass.qr_code) {
      res.status(404).send('QR code not found');
      return;
    }

    // Convert base64 data URL to binary
    const base64Data = gatePass.qr_code.split(',')[1];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    });

    res.send(imageBuffer);
  }
}