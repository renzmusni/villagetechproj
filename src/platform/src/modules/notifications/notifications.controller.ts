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
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  SearchNotificationsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
  NotificationType,
  NotificationChannel,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createNotificationDto: CreateNotificationDto): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.create(createNotificationDto);
    return {
      success: true,
      data: notification,
      message: 'Notification created successfully',
    };
  }

  @Post('send')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Send a notification immediately' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendNotification(@Body() options: {
    type: NotificationType;
    title: string;
    message: string;
    recipient_id?: string;
    recipient_email?: string;
    recipient_phone?: string;
    household_id?: string;
    channels?: NotificationChannel[];
    priority?: string;
    data?: Record<string, any>;
    scheduled_at?: string;
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendNotification({
      ...options,
      priority: options.priority as any,
      scheduled_at: options.scheduled_at ? new Date(options.scheduled_at) : undefined,
    });
    return {
      success: true,
      data: notification,
      message: 'Notification sent successfully',
    };
  }

  @Post('send-email')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({ status: 201, description: 'Email notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendEmailNotification(@Body() options: {
    to: string;
    subject: string;
    template: string;
    variables?: Record<string, any>;
    recipient_id?: string;
    priority?: string;
    data?: Record<string, any>;
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendEmailNotification({
      ...options,
      priority: options.priority as any,
    });
    return {
      success: true,
      data: notification,
      message: 'Email notification sent successfully',
    };
  }

  @Post('send-sms')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({ status: 201, description: 'SMS notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendSMSNotification(@Body() options: {
    to: string;
    message: string;
    recipient_id?: string;
    priority?: string;
    data?: Record<string, any>;
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendSMSNotification({
      ...options,
      priority: options.priority as any,
    });
    return {
      success: true,
      data: notification,
      message: 'SMS notification sent successfully',
    };
  }

  @Post('send-bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Send bulk notifications to multiple recipients' })
  @ApiResponse({ status: 201, description: 'Bulk notifications sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendBulkNotifications(
    @Body() options: {
      notifications: Array<{
        type: NotificationType;
        title: string;
        message: string;
        recipient_id: string;
        channels?: NotificationChannel[];
        data?: Record<string, any>;
      }>;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const notifications = await this.notificationsService.sendBulkNotifications(
      options.notifications,
      currentUser.sub,
    );
    return {
      success: true,
      data: notifications,
      message: `${notifications.length} notifications sent successfully`,
    };
  }

  @Post('send-to-household')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Send notification to all household members' })
  @ApiResponse({ status: 201, description: 'Household notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendToHousehold(
    @Body() options: {
      household_id: string;
      type: NotificationType;
      title: string;
      message: string;
      channels?: NotificationChannel[];
      excludeUserIds?: string[];
      data?: Record<string, any>;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const notifications = await this.notificationsService.sendToHousehold(options.household_id, {
      ...options,
      sender_id: currentUser.sub,
    });
    return {
      success: true,
      data: notifications,
      message: 'Household notification sent successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchNotificationsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.notificationsService.findAll(searchDto, currentUser.sub);
    return {
      success: true,
      data: result.notifications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('my-notifications')
  @TenantRequired()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'User notifications retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getMyNotifications(
    @Query() searchDto: SearchNotificationsDto,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const result = await this.notificationsService.findByRecipient(currentUser.sub, searchDto);
    return {
      success: true,
      data: result.notifications,
      total: result.total,
      unread_count: result.unread_count,
    };
  }

  @Get('unread-count')
  @TenantRequired()
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getUnreadCount(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const count = await this.notificationsService.getUnreadCount(currentUser.sub);
    return {
      success: true,
      data: { unread_count: count },
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(
    @Query('days') days?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const statistics = await this.notificationsService.getStatistics(
      currentUser.tenant_id,
      days || 30,
    );
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('trends')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get notification trends over time' })
  @ApiResponse({ status: 200, description: 'Trends retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getTrends(
    @Query('days') days?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const trends = await this.notificationsService.getNotificationTrends(
      currentUser.tenant_id,
      days || 30,
    );
    return {
      success: true,
      data: trends,
    };
  }

  @Get('household/:householdId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get notifications for a specific household' })
  @ApiResponse({ status: 200, description: 'Household notifications retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getHouseholdNotifications(
    @Param('householdId') householdId: string,
    @Query() searchDto: SearchNotificationsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.notificationsService.findByHousehold(householdId, searchDto);
    return {
      success: true,
      data: result.notifications,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ status: 200, description: 'Notification retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.findOne(id);
    return {
      success: true,
      data: notification,
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Update notification' })
  @ApiResponse({ status: 200, description: 'Notification updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async update(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.update(id, updateNotificationDto);
    return {
      success: true,
      data: notification,
      message: 'Notification updated successfully',
    };
  }

  @Post(':id/mark-read')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const notification = await this.notificationsService.markAsRead(id, currentUser.sub);
    return {
      success: true,
      data: notification,
      message: 'Notification marked as read',
    };
  }

  @Post('mark-all-read')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async markAllAsRead(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const count = await this.notificationsService.markAllAsRead(currentUser.sub);
    return {
      success: true,
      data: { marked_count: count },
      message: `${count} notifications marked as read`,
    };
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled notification' })
  @ApiResponse({ status: 200, description: 'Notification cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async cancel(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.cancel(id);
    return {
      success: true,
      data: notification,
      message: 'Notification cancelled successfully',
    };
  }

  @Post(':id/reschedule')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reschedule a notification' })
  @ApiResponse({ status: 200, description: 'Notification rescheduled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async reschedule(
    @Param('id') id: string,
    @Body('new_date') newDate: string,
  ): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.reschedule(id, new Date(newDate));
    return {
      success: true,
      data: notification,
      message: 'Notification rescheduled successfully',
    };
  }

  @Post(':id/retry')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed notification' })
  @ApiResponse({ status: 200, description: 'Notification retry initiated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async retry(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.retryFailedNotification(id);
    return {
      success: true,
      data: notification,
      message: 'Notification retry initiated successfully',
    };
  }

  @Post('guest-notification')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.HOUSEHOLD_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Send a guest-related notification' })
  @ApiResponse({ status: 201, description: 'Guest notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendGuestNotification(@Body() options: {
    type: NotificationType;
    guest_data: any;
    channels?: NotificationChannel[];
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendGuestNotification(
      options.type,
      options.guest_data,
      options.channels,
    );
    return {
      success: true,
      data: notification,
      message: 'Guest notification sent successfully',
    };
  }

  @Post('security-notification')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.SECURITY)
  @TenantRequired()
  @ApiOperation({ summary: 'Send a security-related notification' })
  @ApiResponse({ status: 201, description: 'Security notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendSecurityNotification(@Body() options: {
    type: NotificationType;
    data: any;
    channels?: NotificationChannel[];
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendSecurityNotification(
      options.type,
      options.data,
      options.channels,
    );
    return {
      success: true,
      data: notification,
      message: 'Security notification sent successfully',
    };
  }

  @Post('system-notification')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @TenantRequired()
  @ApiOperation({ summary: 'Send a system-wide notification' })
  @ApiResponse({ status: 201, description: 'System notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async sendSystemNotification(@Body() options: {
    type: NotificationType;
    data: any;
    channels?: NotificationChannel[];
  }): Promise<ApiResponseDto<any>> {
    const notification = await this.notificationsService.sendSystemNotification(
      options.type,
      options.data,
      options.channels,
    );
    return {
      success: true,
      data: notification,
      message: 'System notification sent successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.notificationsService.remove(id);
    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }
}