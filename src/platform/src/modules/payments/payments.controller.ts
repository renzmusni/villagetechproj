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
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentDto,
  SearchPaymentsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
  PaymentType,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
  PaymentFrequency,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<ApiResponseDto<any>> {
    const payment = await this.paymentsService.create(createPaymentDto);
    return {
      success: true,
      data: payment,
      message: 'Payment created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all payments with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchPaymentsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.paymentsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.payments,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Get payment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(
    @Query('days') days?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.paymentsService.getStatistics(tenantId, days || 30);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('revenue-metrics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getRevenueMetrics(
    @Query('days') days?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const metrics = await this.paymentsService.getRevenueMetrics(tenantId, days || 30);
    return {
      success: true,
      data: metrics,
    };
  }

  @Get('overdue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get overdue payments' })
  @ApiResponse({ status: 200, description: 'Overdue payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getOverduePayments(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const payments = await this.paymentsService.getOverduePayments(tenantId);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('pending')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Get pending payments' })
  @ApiResponse({ status: 200, description: 'Pending payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPendingPayments(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const payments = await this.paymentsService.getPendingPayments(tenantId);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('failed')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Get failed payments' })
  @ApiResponse({ status: 200, description: 'Failed payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getFailedPayments(
    @Query('hours') hours: number = 24,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const payments = await this.paymentsService.getFailedPayments(tenantId, hours);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('due-soon')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Get payments due soon' })
  @ApiResponse({ status: 200, description: 'Payments due soon retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPaymentsDueSoon(
    @Query('days') days: number = 7,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const payments = await this.paymentsService.getPaymentsDueSoon(tenantId, days);
    return {
      success: true,
      data: payments,
    };
  }

  @Get('transaction/:transactionId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get payment by transaction ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findByTransactionId(@Param('transactionId') transactionId: string): Promise<ApiResponseDto<any>> {
    const payment = await this.paymentsService.findByTransactionId(transactionId);
    return {
      success: true,
      data: payment,
    };
  }

  @Get('household/:householdId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get payments by household' })
  @ApiResponse({ status: 200, description: 'Household payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByHousehold(
    @Param('householdId') householdId: string,
    @Query() searchDto: SearchPaymentsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.paymentsRepository.findByHousehold(householdId, searchDto);
    return {
      success: true,
      data: result.payments,
      total: result.total,
    };
  }

  @Get('user/:userId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get payments by user' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByUser(
    @Param('userId') userId: string,
    @Query() searchDto: SearchPaymentsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.paymentsRepository.findByUser(userId, searchDto);
    return {
      success: true,
      data: result.payments,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const payment = await this.paymentsService.findOne(id);
    return {
      success: true,
      data: payment,
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<ApiResponseDto<any>> {
    const payment = await this.paymentsService.update(id, updatePaymentDto);
    return {
      success: true,
      data: payment,
      message: 'Payment updated successfully',
    };
  }

  // Payment processing endpoints
  @Post(':id/process-stripe')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process Stripe payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async processStripePayment(
    @Param('id') id: string,
    @Body() paymentData: {
      payment_method_id: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.paymentsService.processStripePayment(
      id,
      paymentData.payment_method_id,
      currentUser.sub,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: 'Payment processing failed',
      };
    }

    return {
      success: true,
      data: result.payment,
      clientSecret: result.clientSecret,
      message: 'Payment processing initiated',
    };
  }

  @Post(':id/confirm-stripe')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm Stripe payment' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async confirmStripePayment(
    @Param('id') id: string,
    @Body() confirmationData: {
      payment_intent_id: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.paymentsService.confirmStripePayment(
      confirmationData.payment_intent_id,
      currentUser.sub,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: 'Payment confirmation failed',
      };
    }

    return {
      success: true,
      data: result.payment,
      message: 'Payment confirmed successfully',
    };
  }

  @Post(':id/process-paypal')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process PayPal payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async processPayPalPayment(
    @Param('id') id: string,
    @Body() paymentData: {
      return_url: string;
      cancel_url: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.paymentsService.processPayPalPayment(
      id,
      paymentData.return_url,
      paymentData.cancel_url,
      currentUser.sub,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: 'PayPal payment processing failed',
      };
    }

    return {
      success: true,
      data: result.payment,
      approvalUrl: result.approvalUrl,
      message: 'PayPal payment initiated',
    };
  }

  @Post(':id/capture-paypal')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture PayPal payment' })
  @ApiResponse({ status: 200, description: 'Payment captured successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async capturePayPalPayment(
    @Param('id') id: string,
    @Body() captureData: {
      order_id: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.paymentsService.capturePayPalPayment(
      captureData.order_id,
      currentUser.sub,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: 'PayPal capture failed',
      };
    }

    return {
      success: true,
      data: result.payment,
      message: 'PayPal payment captured successfully',
    };
  }

  @Post(':id/refund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund payment' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async refund(
    @Param('id') id: string,
    @Body() refundData: {
      amount?: number;
      reason: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.paymentsService.refundPayment(
      id,
      refundData.amount,
      refundData.reason,
      currentUser.sub,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: 'Refund processing failed',
      };
    }

    return {
      success: true,
      data: result.refund,
      message: 'Payment refunded successfully',
    };
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const payment = await this.paymentsService.cancelPayment(id, reason, currentUser.sub);

    return {
      success: true,
      data: payment,
      message: 'Payment cancelled successfully',
    };
  }

  @Post(':id/mark-overdue')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark payment as overdue' })
  @ApiResponse({ status: 200, description: 'Payment marked as overdue' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async markAsOverdue(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const payment = await this.paymentsService.markAsOverdue(id);

    return {
      success: true,
      data: payment,
      message: 'Payment marked as overdue',
    };
  }

  // Template endpoints
  @Post('hoa-dues')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Create HOA dues payment' })
  @ApiResponse({ status: 201, description: 'HOA dues payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createHOADues(
    @Body() duesData: {
      household_id: string;
      user_id?: string;
      amount: number;
      due_date: string;
      period: string;
      description?: string;
      recurring?: boolean;
      frequency?: PaymentFrequency;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const payment = await this.paymentsService.createHOADues({
      ...duesData,
      tenant_id: currentUser.tenant_id,
      created_by: currentUser.sub,
    });
    return {
      success: true,
      data: payment,
      message: 'HOA dues payment created successfully',
    };
  }

  @Post('special-assessment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create special assessment payment' })
  @ApiResponse({ status: 201, description: 'Special assessment payment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createSpecialAssessment(
    @Body() assessmentData: {
      household_id?: string;
      amount: number;
      due_date: string;
      project_name: string;
      project_description: string;
      assessment_type: string;
      assessment_period: {
        start_date: string;
        end_date: string;
      };
      payment_schedule?: string[];
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;

    // If no household_id provided, apply to all households (admin function)
    if (!assessmentData.household_id && currentUser.roles.includes('TENANT_ADMIN')) {
      // This would apply to all households - implement logic accordingly
      throw new Error('Household ID is required for special assessments');
    }

    const payment = await this.paymentsService.createSpecialAssessment({
      ...assessmentData,
      tenant_id: currentUser.tenant_id,
      created_by: currentUser.sub,
    });
    return {
      success: true,
      data: payment,
      message: 'Special assessment payment created successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete payment' })
  @ApiResponse({ status: 200, description: 'Payment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.paymentsService.remove(id);
    return {
      success: true,
      message: 'Payment deleted successfully',
    };
  }
}