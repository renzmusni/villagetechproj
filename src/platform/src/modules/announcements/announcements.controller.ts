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
import { AnnouncementsService } from './announcements.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  SearchAnnouncementsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
  AnnouncementType,
  AnnouncementPriority,
  AnnouncementAudience,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Announcements')
@Controller('announcements')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createAnnouncementDto: CreateAnnouncementDto): Promise<ApiResponseDto<any>> {
    const announcement = await this.announcementsService.create(createAnnouncementDto);
    return {
      success: true,
      data: announcement,
      message: 'Announcement created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all announcements with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Announcements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchAnnouncementsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.announcementsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.announcements,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('active')
  @TenantRequired()
  @ApiOperation({ summary: 'Get active announcements for the current user' })
  @ApiResponse({ status: 200, description: 'Active announcements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActiveAnnouncements(
    @Query('limit') limit?: number,
    @Query('include_pinned') includePinned?: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const announcements = await this.announcementsService.getActiveAnnouncements(tenantId, {
      userId: currentUser.sub,
      userRoles: currentUser.roles,
      householdId: currentUser.household_id,
      limit: limit ? parseInt(limit) : undefined,
      includePinned: includePinned !== 'false',
    });
    return {
      success: true,
      data: announcements,
    };
  }

  @Get('pinned')
  @TenantRequired()
  @ApiOperation({ summary: 'Get pinned announcements' })
  @ApiResponse({ status: 200, description: 'Pinned announcements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPinnedAnnouncements(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const announcements = await this.announcementsService.getPinnedAnnouncements(tenantId);
    return {
      success: true,
      data: announcements,
    };
  }

  @Get('emergency')
  @TenantRequired()
  @ApiOperation({ summary: 'Get emergency announcements' })
  @ApiResponse({ status: 200, description: 'Emergency announcements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getEmergencyAnnouncements(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const announcements = await this.announcementsService.getEmergencyAnnouncements(tenantId);
    return {
      success: true,
      data: announcements,
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Get announcement statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(
    @Query('days') days?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.announcementsService.getStatistics(tenantId, days || 30);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('popular-tags')
  @TenantRequired()
  @ApiOperation({ summary: 'Get popular announcement tags' })
  @ApiResponse({ status: 200, description: 'Popular tags retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPopularTags(
    @Query('limit') limit?: number,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const tags = await this.announcementsService.getPopularTags(tenantId, limit ? parseInt(limit) : 20);
    return {
      success: true,
      data: tags,
    };
  }

  @Get('pending-approval')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Get announcements pending approval' })
  @ApiResponse({ status: 200, description: 'Pending approvals retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getPendingApprovals(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const announcements = await this.announcementsService.getAnnouncementsRequiringApproval(tenantId);
    return {
      success: true,
      data: announcements,
    };
  }

  @Get('author/:authorId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get announcements by author' })
  @ApiResponse({ status: 200, description: 'Author announcements retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByAuthor(
    @Param('authorId') authorId: string,
    @Query() searchDto: SearchAnnouncementsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.announcementsService.findAll({ ...searchDto, author_id: authorId });
    return {
      success: true,
      data: result.announcements,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({ status: 200, description: 'Announcement retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async findOne(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;

    const announcement = await this.announcementsService.findOne(id);

    // Record view if announcement is published
    if (announcement.is_published) {
      await this.announcementsService.recordView(id, currentUser.sub);
    }

    return {
      success: true,
      data: announcement,
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async update(
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<ApiResponseDto<any>> {
    const announcement = await this.announcementsService.update(id, updateAnnouncementDto);
    return {
      success: true,
      data: announcement,
      message: 'Announcement updated successfully',
    };
  }

  @Post(':id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement published successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async publish(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.publish(id, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement published successfully',
    };
  }

  @Post(':id/schedule')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement scheduled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async schedule(
    @Param('id') id: string,
    @Body() scheduleData: {
      publish_date: string;
      expire_date?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.schedule(
      id,
      new Date(scheduleData.publish_date),
      scheduleData.expire_date ? new Date(scheduleData.expire_date) : undefined,
      currentUser.sub,
    );
    return {
      success: true,
      data: announcement,
      message: 'Announcement scheduled successfully',
    };
  }

  @Post(':id/archive')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement archived successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async archive(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.archive(id, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement archived successfully',
    };
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.cancel(id, reason, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement cancelled successfully',
    };
  }

  @Post(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approve(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.approve(id, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement approved successfully',
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.reject(id, reason, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement rejected successfully',
    };
  }

  // Engagement endpoints
  @Post(':id/read')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark announcement as read' })
  @ApiResponse({ status: 200, description: 'Announcement marked as read' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async markAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.recordRead(id, currentUser.sub);
    return {
      success: true,
      data: { read_count: announcement.read_count },
      message: 'Announcement marked as read',
    };
  }

  @Post(':id/acknowledge')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement acknowledged successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async acknowledge(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.recordAcknowledgment(id, currentUser.sub);
    return {
      success: true,
      data: { acknowledgment_count: announcement.acknowledgment_count },
      message: 'Announcement acknowledged successfully',
    };
  }

  @Post(':id/share')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record announcement share' })
  @ApiResponse({ status: 200, description: 'Share recorded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async share(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.recordShare(id, currentUser.sub);
    return {
      success: true,
      data: { share_count: announcement.share_count },
      message: 'Share recorded successfully',
    };
  }

  @Post(':id/click')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record announcement click-through' })
  @ApiResponse({ status: 200, description: 'Click recorded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async click(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.recordClick(id, currentUser.sub);
    return {
      success: true,
      message: 'Click recorded successfully',
    };
  }

  // Comment and reaction endpoints
  @Post(':id/comment')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a comment to an announcement' })
  @ApiResponse({ status: 200, description: 'Comment added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addComment(
    @Param('id') id: string,
    @Body() commentData: {
      content: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.addComment(id, {
      user_id: currentUser.sub,
      user_name: currentUser.display_name,
      content: commentData.content,
    });
    return {
      success: true,
      data: announcement.engagement?.comments,
      message: 'Comment added successfully',
    };
  }

  @Post(':id/react')
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a reaction to an announcement' })
  @ApiResponse({ status: 200, description: 'Reaction added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async addReaction(
    @Param('id') id: string,
    @Body('reaction_type') reactionType: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.addReaction(id, reactionType, currentUser.sub);
    return {
      success: true,
      data: announcement.engagement?.reactions,
      message: 'Reaction added successfully',
    };
  }

  // Pinning endpoints
  @Post(':id/pin')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pin an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement pinned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async pin(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.pin(id, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement pinned successfully',
    };
  }

  @Post(':id/unpin')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpin an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement unpinned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async unpin(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.unpin(id, currentUser.sub);
    return {
      success: true,
      data: announcement,
      message: 'Announcement unpinned successfully',
    };
  }

  // Template-based announcement endpoints
  @Post('emergency')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create an emergency announcement' })
  @ApiResponse({ status: 201, description: 'Emergency announcement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createEmergencyAnnouncement(
    @Body() emergencyData: {
      title: string;
      content: string;
      audience?: AnnouncementAudience;
      priority?: AnnouncementPriority;
      targeting?: any;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.createEmergencyAnnouncement({
      title: emergencyData.title,
      content: emergencyData.content,
      author_id: currentUser.sub,
      tenant_id: currentUser.tenant_id,
      audience: emergencyData.audience,
      priority: emergencyData.priority,
      targeting: emergencyData.targeting,
    });
    return {
      success: true,
      data: announcement,
      message: 'Emergency announcement created successfully',
    };
  }

  @Post('maintenance-notice')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a maintenance notice' })
  @ApiResponse({ status: 201, description: 'Maintenance notice created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createMaintenanceNotice(
    @Body() maintenanceData: {
      title: string;
      content: string;
      scheduled_date: string;
      expected_duration: string;
      affected_areas?: string[];
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.createMaintenanceNotice({
      title: maintenanceData.title,
      content: maintenanceData.content,
      author_id: currentUser.sub,
      tenant_id: currentUser.tenant_id,
      scheduled_date: new Date(maintenanceData.scheduled_date),
      expected_duration: maintenanceData.expected_duration,
      affected_areas: maintenanceData.affected_areas,
    });
    return {
      success: true,
      data: announcement,
      message: 'Maintenance notice created successfully',
    };
  }

  @Post('event-announcement')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create an event announcement' })
  @ApiResponse({ status: 201, description: 'Event announcement created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createEventAnnouncement(
    @Body() eventData: {
      title: string;
      content: string;
      event_date: string;
      location: string;
      rsvp_required?: boolean;
      max_attendees?: number;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const announcement = await this.announcementsService.createEventAnnouncement({
      title: eventData.title,
      content: eventData.content,
      author_id: currentUser.sub,
      tenant_id: currentUser.tenant_id,
      event_date: new Date(eventData.event_date),
      location: eventData.location,
      rsvp_required: eventData.rsvp_required,
      max_attendees: eventData.max_attendees,
    });
    return {
      success: true,
      data: announcement,
      message: 'Event announcement created successfully',
    };
  }

  @Post(':id/upload-attachment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload an attachment to an announcement' })
  @ApiResponse({ status: 200, description: 'Attachment uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() attachmentData: {
      description?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;

    // This would typically integrate with a file storage service
    const attachment = {
      id: '', // Would be generated
      name: file.originalname,
      url: `/uploads/announcements/${id}/${file.originalname}`, // Mock URL
      type: file.mimetype,
      size: file.size,
      description: attachmentData.description,
    };

    const announcement = await this.announcementsService.update(id, {
      updated_by: currentUser.sub,
      attachments: [attachment], // This would merge with existing attachments
    });

    return {
      success: true,
      data: attachment,
      message: 'Attachment uploaded successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.announcementsService.remove(id);
    return {
      success: true,
      message: 'Announcement deleted successfully',
    };
  }
}