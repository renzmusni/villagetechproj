import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnnouncementsRepository } from './announcements.repository';
import {
  AnnouncementEntity,
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority,
  AnnouncementAudience,
  NotificationMethod,
} from './entities/announcement.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto, SearchAnnouncementsDto } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit } from '@hoa-platform/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly announcementsRepository: AnnouncementsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly configService: ConfigService,
  ) {}

  async create(createAnnouncementDto: CreateAnnouncementDto): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.create(createAnnouncementDto);

    // Log announcement creation
    await this.auditService.log({
      action: 'create',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: createAnnouncementDto.author_id,
      details: {
        title: announcement.title,
        type: announcement.type,
        audience: announcement.audience,
        priority: announcement.priority,
      },
    });

    // Send notifications if published immediately
    if (announcement.status === AnnouncementStatus.PUBLISHED && announcement.send_immediately) {
      await this.sendAnnouncementNotifications(announcement);
    }

    return announcement;
  }

  async findAll(options: SearchAnnouncementsDto = {}, tenantId?: string): Promise<{
    announcements: AnnouncementEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.announcementsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<AnnouncementEntity> {
    return await this.announcementsRepository.findOne(id);
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.update(id, updateAnnouncementDto);

    await this.auditService.log({
      action: 'update',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: updateAnnouncementDto.updated_by,
      details: updateAnnouncementDto,
    });

    return announcement;
  }

  @Audit('delete', 'announcement')
  async remove(id: string): Promise<void> {
    await this.announcementsRepository.remove(id);
  }

  // Publishing workflow methods
  async publish(id: string, publishedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.publish(id);

    await this.auditService.log({
      action: 'publish',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: publishedBy,
    });

    // Send notifications
    await this.sendAnnouncementNotifications(announcement);

    return announcement;
  }

  async schedule(id: string, publishDate: Date, expireDate?: Date, scheduledBy?: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.schedule(id, publishDate, expireDate);

    await this.auditService.log({
      action: 'schedule',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: scheduledBy,
      details: { publish_date: publishDate, expire_date: expireDate },
    });

    return announcement;
  }

  async archive(id: string, archivedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.archive(id);

    await this.auditService.log({
      action: 'archive',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: archivedBy,
    });

    return announcement;
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.cancel(id, reason);

    await this.auditService.log({
      action: 'cancel',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: cancelledBy,
      details: { reason },
    });

    return announcement;
  }

  // Approval workflow methods
  async approve(id: string, approvedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.approve(id, approvedBy);

    await this.auditService.log({
      action: 'approve',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: approvedBy,
    });

    return announcement;
  }

  async reject(id: string, reason: string, rejectedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.reject(id, reason);

    await this.auditService.log({
      action: 'reject',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: rejectedBy,
      details: { reason },
    });

    return announcement;
  }

  // Engagement methods
  async recordView(id: string, userId?: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.recordEngagement(id, {
      action: 'view',
      userId,
    });

    if (userId) {
      await this.auditService.log({
        action: 'view',
        entity_type: 'announcement',
        entity_id: announcement.id,
        tenant_id: announcement.tenant_id,
        user_id: userId,
      });
    }

    return announcement;
  }

  async recordRead(id: string, userId: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.recordEngagement(id, {
      action: 'read',
      userId,
    });

    await this.auditService.log({
      action: 'read',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: userId,
    });

    return announcement;
  }

  async recordAcknowledgment(id: string, userId: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.recordEngagement(id, {
      action: 'acknowledge',
      userId,
    });

    await this.auditService.log({
      action: 'acknowledge',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: userId,
    });

    return announcement;
  }

  async recordShare(id: string, userId?: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.recordEngagement(id, {
      action: 'share',
      userId,
    });

    if (userId) {
      await this.auditService.log({
        action: 'share',
        entity_type: 'announcement',
        entity_id: announcement.id,
        tenant_id: announcement.tenant_id,
        user_id: userId,
      });
    }

    return announcement;
  }

  async recordClick(id: string, userId?: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.recordEngagement(id, {
      action: 'click',
      userId,
    });

    if (userId) {
      await this.auditService.log({
        action: 'click',
        entity_type: 'announcement',
      entity_id: announcement.id,
        tenant_id: announcement.tenant_id,
      user_id: userId,
      });
    }

    return announcement;
  }

  // Comment and reaction methods
  async addComment(id: string, commentData: {
    user_id: string;
    user_name: string;
    content: string;
  }): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.addComment(id, {
      id: '', // Will be generated
      ...commentData,
    });

    await this.auditService.log({
      action: 'add_comment',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: commentData.user_id,
      details: { content: commentData.content },
    });

    return announcement;
  }

  async addReaction(id: string, reactionType: string, userId: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.addReaction(id, reactionType, userId);

    await this.auditService.log({
      action: 'add_reaction',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: userId,
      details: { reaction_type: reactionType },
    });

    return announcement;
  }

  // Pinning methods
  async pin(id: string, pinnedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.pin(id);

    await this.auditService.log({
      action: 'pin',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: pinnedBy,
    });

    return announcement;
  }

  async unpin(id: string, unpinnedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.unpin(id);

    await this.auditService.log({
      action: 'unpin',
      entity_type: 'announcement',
      entity_id: announcement.id,
      tenant_id: announcement.tenant_id,
      user_id: unpinnedBy,
    });

    return announcement;
  }

  // Query methods for different use cases
  async getActiveAnnouncements(tenantId: string, options: {
    userId?: string;
    userRoles?: string[];
    householdId?: string;
    limit?: number;
    includePinned?: boolean;
  } = {}): Promise<AnnouncementEntity[]> {
    return await this.announcementsRepository.getActiveAnnouncements(tenantId, options);
  }

  async getPinnedAnnouncements(tenantId: string): Promise<AnnouncementEntity[]> {
    return await this.announcementsRepository.getPinnedAnnouncements(tenantId);
  }

  async getEmergencyAnnouncements(tenantId: string): Promise<AnnouncementEntity[]> {
    return await this.announcementsRepository.getEmergencyAnnouncements(tenantId);
  }

  async getAnnouncementsRequiringApproval(tenantId: string): Promise<AnnouncementEntity[]> {
    return await this.announcementsRepository.getAnnouncementsRequiringApproval(tenantId);
  }

  async getStatistics(tenantId?: string, days: number = 30): Promise<any> {
    return await this.announcementsRepository.getStatistics(tenantId, days);
  }

  async getPopularTags(tenantId?: string, limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    return await this.announcementsRepository.getPopularTags(tenantId, limit);
  }

  // Template-based announcements
  async createEmergencyAnnouncement(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    audience?: AnnouncementAudience;
    priority?: AnnouncementPriority;
    targeting?: any;
  }): Promise<AnnouncementEntity> {
    const announcementData = AnnouncementEntity.createEmergencyAnnouncement(data);
    const announcement = await this.create(announcementData);

    // Send immediately for emergency announcements
    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      await this.sendAnnouncementNotifications(announcement);
    }

    return announcement;
  }

  async createMaintenanceNotice(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    scheduled_date: Date;
    expected_duration: string;
    affected_areas?: string[];
  }): Promise<AnnouncementEntity> {
    const announcementData = AnnouncementEntity.createMaintenanceNotice(data);
    const announcement = await this.create(announcementData);

    // Schedule notifications for maintenance notices
    if (announcement.status === AnnouncementStatus.SCHEDULED) {
      // This will be picked up by the scheduled task
    }

    return announcement;
  }

  async createEventAnnouncement(data: {
    title: string;
    content: string;
    author_id: string;
    tenant_id: string;
    event_date: Date;
    location: string;
    rsvp_required?: boolean;
    max_attendees?: number;
  }): Promise<AnnouncementEntity> {
    const announcementData = AnnouncementEntity.createEventAnnouncement(data);
    return await this.create(announcementData);
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledAnnouncements(): Promise<void> {
    try {
      const scheduledAnnouncements = await this.announcementsRepository.getScheduledAnnouncements();

      for (const announcement of scheduledAnnouncements) {
        await this.publish(announcement.id, 'system');

        // Update last notified timestamp
        await this.announcementsRepository.update(announcement.id, {
          last_notified_at: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Error processing scheduled announcements:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredAnnouncements(): Promise<void> {
    try {
      const expiredAnnouncements = await this.announcementsRepository.getExpiredAnnouncements();

      for (const announcement of expiredAnnouncements) {
        await this.announcementsRepository.updateStatus(announcement.id, AnnouncementStatus.EXPIRED);
      }
    } catch (error) {
      this.logger.error('Error processing expired announcements:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldAnnouncements(): Promise<void> {
    try {
      const daysToKeep = this.configService.get<number>('announcements.retention_days', 365);
      const deletedCount = await this.announcementsRepository.cleanupOldAnnouncements(daysToKeep);

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old announcements`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old announcements:', error);
    }
  }

  // Private helper methods
  private async sendAnnouncementNotifications(announcement: AnnouncementEntity): Promise<void> {
    try {
      const recipients = await this.getTargetRecipients(announcement);

      for (const method of announcement.notification_methods) {
        await this.sendNotificationByMethod(announcement, method, recipients);
      }

      // Update last notified timestamp
      await this.announcementsRepository.update(announcement.id, {
        last_notified_at: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to send notifications for announcement ${announcement.id}:`, error);
    }
  }

  private async getTargetRecipients(announcement: AnnouncementEntity): Promise<{
    users: string[];
    households: string[];
    emails: string[];
    phones: string[];
  }> {
    const recipients = {
      users: [] as string[],
      households: [] as string[],
      emails: [] as string[],
      phones: [] as string[],
    };

    switch (announcement.audience) {
      case AnnouncementAudience.ALL_RESIDENTS:
        // Get all active users in the tenant
        const allUsers = await this.usersService.findByTenant(announcement.tenant_id!, {
          status: 'active',
          limit: 10000, // Large number to get all users
        });
        recipients.users = allUsers.users.map(u => u.id);
        recipients.emails = allUsers.users.map(u => u.email).filter(Boolean);
        recipients.phones = allUsers.users.map(u => u.phone).filter(Boolean);
        break;

      case AnnouncementAudience.BOARD_MEMBERS:
        const boardMembers = await this.usersService.findByRole('board_member', announcement.tenant_id!);
        recipients.users = boardMembers.map(u => u.id);
        recipients.emails = boardMembers.map(u => u.email).filter(Boolean);
        recipients.phones = boardMembers.map(u => u.phone).filter(Boolean);
        break;

      case AnnouncementAudience.PROPERTY_OWNERS:
        const propertyOwners = await this.usersService.findByRole('property_owner', announcement.tenant_id!);
        recipients.users = propertyOwners.map(u => u.id);
        recipients.emails = propertyOwners.map(u => u.email).filter(Boolean);
        recipients.phones = propertyOwners.map(u => u.phone).filter(Boolean);
        break;

      case AnnouncementAudience.SPECIFIC_USERS:
        if (announcement.targeting?.user_ids) {
          const users = await this.usersService.findByIds(announcement.targeting.user_ids);
          recipients.users = users.map(u => u.id);
          recipients.emails = users.map(u => u.email).filter(Boolean);
          recipients.phones = users.map(u => u.phone).filter(Boolean);
        }
        break;

      case AnnouncementAudience.SPECIFIC_HOUSEHOLDS:
        if (announcement.targeting?.household_ids) {
          const households = await this.householdsService.findByIds(announcement.targeting.household_ids);
          recipients.households = households.map(h => h.id);

          // Get all users from these households
          for (const household of households) {
            const householdUsers = await this.usersService.findByHousehold(household.id);
            recipients.users.push(...householdUsers.map(u => u.id));
            recipients.emails.push(...householdUsers.map(u => u.email).filter(Boolean));
            recipients.phones.push(...householdUsers.map(u => u.phone).filter(Boolean));
          }
        }
        break;
    }

    // Remove duplicates
    recipients.users = [...new Set(recipients.users)];
    recipients.emails = [...new Set(recipients.emails)];
    recipients.phones = [...new Set(recipients.phones)];

    return recipients;
  }

  private async sendNotificationByMethod(
    announcement: AnnouncementEntity,
    method: NotificationMethod,
    recipients: {
      users: string[];
      households: string[];
      emails: string[];
      phones: string[];
    },
  ): Promise<void> {
    const notificationData = {
      type: 'announcement' as any,
      title: announcement.title,
      message: announcement.summary || announcement.content_preview,
      data: {
        announcement_id: announcement.id,
        type: announcement.type,
        priority: announcement.priority,
        require_acknowledgment: announcement.require_acknowledgment,
      },
    };

    switch (method) {
      case NotificationMethod.EMAIL:
        if (recipients.emails.length > 0) {
          await Promise.all(
            recipients.emails.map(email =>
              this.notificationsService.sendEmailNotification({
                to: email,
                subject: `Community Announcement: ${announcement.title}`,
                template: 'announcement',
                variables: {
                  title: announcement.title,
                  content: announcement.content,
                  summary: announcement.summary,
                  author_name: announcement.author?.display_name,
                  priority: announcement.display_priority,
                  call_to_action: announcement.call_to_action,
                },
                recipient_id: undefined, // Will be mapped
              })
            )
          );

          // Update email sent count
          if (announcement.analytics) {
            announcement.analytics.email_sents += recipients.emails.length;
          }
        }
        break;

      case NotificationMethod.SMS:
        if (recipients.phones.length > 0 && announcement.is_high_priority) {
          await Promise.all(
            recipients.phones.map(phone =>
              this.notificationsService.sendSMSNotification({
                to: phone,
                message: `HOA: ${announcement.title}. ${announcement.summary || announcement.content_preview}`,
                recipient_id: undefined,
              })
            )
          );

          // Update SMS sent count
          if (announcement.analytics) {
            announcement.analytics.sms_sents += recipients.phones.length;
          }
        }
        break;

      case NotificationMethod.PUSH:
        if (recipients.users.length > 0) {
          await Promise.all(
            recipients.users.map(userId =>
              this.notificationsService.sendNotification({
                ...notificationData,
                recipient_id: userId,
                channels: ['push'],
              })
            )
          );

          // Update push sent count
          if (announcement.analytics) {
            announcement.analytics.push_sents += recipients.users.length;
          }
        }
        break;

      case NotificationMethod.IN_APP:
        // In-app notifications are handled by the frontend polling the API
        break;

      case NotificationMethod.WEBSITE_BANNER:
        // Website banners are handled by frontend reading the announcements API
        break;

      case NotificationMethod.DIGITAL_DISPLAY:
        // Digital displays would poll the announcements API
        break;

      case NotificationMethod.PRINTED_NOTICE:
        // Printed notices would require external service integration
        break;
    }
  }
}