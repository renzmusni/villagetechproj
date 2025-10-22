import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsRepository } from './notifications.repository';
import {
  NotificationEntity,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
} from './entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto, SearchNotificationsDto } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit } from '@hoa-platform/shared';

// External service interfaces (to be implemented with actual providers)
interface EmailService {
  sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    variables?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

interface SMSService {
  sendSMS(options: {
    to: string;
    message: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

interface PushNotificationService {
  sendPushNotification(options: {
    userId: string;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailService: EmailService;
  private smsService: SMSService;
  private pushService: PushNotificationService;

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    // Initialize notification providers (mocked for now)
    this.initializeProviders();
  }

  async create(createNotificationDto: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.create(createNotificationDto);

    // Log notification creation
    await this.auditService.log({
      action: 'create',
      entity_type: 'notification',
      entity_id: notification.id,
      tenant_id: notification.tenant_id,
      user_id: notification.sender_id,
      details: {
        type: notification.type,
        channels: notification.channels,
        recipient_id: notification.recipient_id,
      },
    });

    // Process notification immediately if not scheduled
    if (!notification.is_scheduled) {
      await this.processNotification(notification);
    }

    return notification;
  }

  async findAll(options: SearchNotificationsDto = {}, recipientId?: string): Promise<{
    notifications: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.notificationsRepository.findAll(options, recipientId);
  }

  async findOne(id: string): Promise<NotificationEntity> {
    return await this.notificationsRepository.findOne(id);
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.update(id, updateNotificationDto);

    await this.auditService.log({
      action: 'update',
      entity_type: 'notification',
      entity_id: notification.id,
      tenant_id: notification.tenant_id,
      details: updateNotificationDto,
    });

    return notification;
  }

  @Audit('delete', 'notification')
  async remove(id: string): Promise<void> {
    await this.notificationsRepository.remove(id);
  }

  async markAsRead(id: string, userId?: string): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.markAsRead(id);

    if (userId) {
      await this.auditService.log({
        action: 'mark_read',
        entity_type: 'notification',
        entity_id: notification.id,
        tenant_id: notification.tenant_id,
        user_id: userId,
      });
    }

    return notification;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const count = await this.notificationsRepository.markAllAsRead(recipientId);

    await this.auditService.log({
      action: 'mark_all_read',
      entity_type: 'notification',
      tenant_id: recipientId, // This should be updated to actual tenant_id
      user_id: recipientId,
      details: { marked_count: count },
    });

    return count;
  }

  async sendNotification(options: {
    type: NotificationType;
    title: string;
    message: string;
    recipient_id?: string;
    recipient_email?: string;
    recipient_phone?: string;
    household_id?: string;
    sender_id?: string;
    channels?: NotificationChannel[];
    priority?: NotificationPriority;
    data?: Record<string, any>;
    scheduled_at?: Date;
  }): Promise<NotificationEntity> {
    const notification = await this.create({
      type: options.type,
      title: options.title,
      message: options.message,
      recipient_id: options.recipient_id,
      recipient_email: options.recipient_email,
      recipient_phone: options.recipient_phone,
      household_id: options.household_id,
      sender_id: options.sender_id,
      channels: options.channels || [NotificationChannel.IN_APP],
      priority: options.priority || NotificationPriority.NORMAL,
      data: options.data,
      scheduled_at: options.scheduled_at,
      is_scheduled: !!options.scheduled_at,
    });

    return notification;
  }

  async sendEmailNotification(options: {
    to: string;
    subject: string;
    template: string;
    variables?: Record<string, any>;
    recipient_id?: string;
    sender_id?: string;
    priority?: NotificationPriority;
    data?: Record<string, any>;
  }): Promise<NotificationEntity> {
    const notification = await this.create({
      type: NotificationType.SYSTEM_UPDATE,
      title: options.subject,
      message: options.template,
      recipient_email: options.to,
      recipient_id: options.recipient_id,
      sender_id: options.sender_id,
      channels: [NotificationChannel.EMAIL],
      priority: options.priority || NotificationPriority.NORMAL,
      data: options.data,
      email_template: {
        subject: options.subject,
        template: options.template,
        variables: options.variables || {},
      },
    });

    return notification;
  }

  async sendSMSNotification(options: {
    to: string;
    message: string;
    recipient_id?: string;
    sender_id?: string;
    priority?: NotificationPriority;
    data?: Record<string, any>;
  }): Promise<NotificationEntity> {
    const notification = await this.create({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'SMS Notification',
      message: options.message,
      recipient_phone: options.to,
      recipient_id: options.recipient_id,
      sender_id: options.sender_id,
      channels: [NotificationChannel.SMS],
      priority: options.priority || NotificationPriority.NORMAL,
      data: options.data,
      sms_template: {
        message: options.message,
        variables: {},
      },
    });

    return notification;
  }

  async sendBulkNotifications(notificationData: Array<{
    type: NotificationType;
    title: string;
    message: string;
    recipient_id: string;
    channels?: NotificationChannel[];
    data?: Record<string, any>;
  }>, senderId?: string): Promise<NotificationEntity[]> {
    const notifications: NotificationEntity[] = [];

    for (const data of notificationData) {
      try {
        const notification = await this.create({
          ...data,
          sender_id: senderId,
          channels: data.channels || [NotificationChannel.IN_APP],
        });
        notifications.push(notification);
      } catch (error) {
        this.logger.error(`Failed to create notification for user ${data.recipient_id}:`, error);
      }
    }

    return notifications;
  }

  async sendToHousehold(
    householdId: string,
    options: {
      type: NotificationType;
      title: string;
      message: string;
      channels?: NotificationChannel[];
      excludeUserIds?: string[];
      sender_id?: string;
      data?: Record<string, any>;
    },
  ): Promise<NotificationEntity[]> {
    // This would require integration with the UsersService to get household members
    // For now, create a household-level notification
    const notification = await this.create({
      ...options,
      household_id: householdId,
      channels: options.channels || [NotificationChannel.IN_APP],
    });

    return [notification];
  }

  async cancel(id: string): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.cancel(id);

    await this.auditService.log({
      action: 'cancel',
      entity_type: 'notification',
      entity_id: notification.id,
      tenant_id: notification.tenant_id,
      details: { status: notification.status },
    });

    return notification;
  }

  async reschedule(id: string, newDate: Date): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.scheduleNotification(id, newDate);

    await this.auditService.log({
      action: 'reschedule',
      entity_type: 'notification',
      entity_id: notification.id,
      tenant_id: notification.tenant_id,
      details: { new_date: newDate },
    });

    return notification;
  }

  async retryFailedNotification(id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id);

    if (!notification.can_retry) {
      throw new Error('Notification cannot be retried');
    }

    // Reset status for retry
    notification.status = NotificationStatus.PENDING;
    notification.retry_count += 1;
    notification.next_retry_at = new Date();

    const updatedNotification = await this.notificationsRepository.update(id, {
      status: NotificationStatus.PENDING,
      retry_count: notification.retry_count,
      next_retry_at: notification.next_retry_at,
    });

    await this.processNotification(updatedNotification);

    return updatedNotification;
  }

  // Template-based notifications
  async sendGuestNotification(
    type: NotificationType,
    guestData: any,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL],
  ): Promise<NotificationEntity> {
    const template = NotificationEntity.createGuestNotification(type, guestData, channels);

    return await this.create({
      ...template,
      data: guestData,
    });
  }

  async sendSecurityNotification(
    type: NotificationType,
    data: any,
    channels: NotificationChannel[] = [NotificationChannel.EMAIL, NotificationChannel.SMS],
  ): Promise<NotificationEntity> {
    const template = NotificationEntity.createSecurityNotification(type, data, channels);

    return await this.create({
      ...template,
      data,
    });
  }

  async sendSystemNotification(
    type: NotificationType,
    data: any,
    channels: NotificationChannel[] = [NotificationChannel.IN_APP],
  ): Promise<NotificationEntity> {
    const template = NotificationEntity.createSystemNotification(type, data, channels);

    return await this.create({
      ...template,
      data,
    });
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications(): Promise<void> {
    try {
      const scheduledNotifications = await this.notificationsRepository.getScheduledNotifications();

      for (const notification of scheduledNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processRetryableNotifications(): Promise<void> {
    try {
      const retryableNotifications = await this.notificationsRepository.getRetryableNotifications();

      for (const notification of retryableNotifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      this.logger.error('Error processing retryable notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredNotifications(): Promise<void> {
    try {
      const expiredNotifications = await this.notificationsRepository.getExpiredNotifications();

      for (const notification of expiredNotifications) {
        await this.notificationsRepository.update(notification.id, {
          status: NotificationStatus.FAILED,
          error_message: 'Notification expired',
          updated_at: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Error processing expired notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldNotifications(): Promise<void> {
    try {
      const daysToKeep = this.configService.get<number>('notifications.retention_days', 90);
      const deletedCount = await this.notificationsRepository.cleanupOldNotifications(daysToKeep);

      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old notifications`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old notifications:', error);
    }
  }

  // Analytics and reporting
  async getStatistics(tenantId?: string, days: number = 30): Promise<any> {
    return await this.notificationsRepository.getStatistics(tenantId, days);
  }

  async getNotificationTrends(tenantId?: string, days: number = 30): Promise<any[]> {
    return await this.notificationsRepository.getNotificationTrends(tenantId, days);
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return await this.notificationsRepository.getUnreadCount(recipientId);
  }

  private async processNotification(notification: NotificationEntity): Promise<void> {
    try {
      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();

      const results = await Promise.allSettled([
        this.processEmailChannel(notification),
        this.processSMSChannel(notification),
        this.processPushChannel(notification),
        this.processWebhookChannel(notification),
      ]);

      // Check if any channel succeeded
      const hasSuccess = results.some(result => result.status === 'fulfilled');

      if (hasSuccess) {
        notification.status = NotificationStatus.DELIVERED;
        notification.delivered_at = new Date();
      }

      // Handle failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error(`Channel ${index} failed for notification ${notification.id}:`, result.reason);
        }
      });

      await this.notificationsRepository.update(notification.id, {
        status: notification.status,
        sent_at: notification.sent_at,
        delivered_at: notification.delivered_at,
        delivery_response: {
          results: results.map(r => r.status === 'fulfilled' ? 'success' : 'failed'),
        },
      });

    } catch (error) {
      this.logger.error(`Failed to process notification ${notification.id}:`, error);
      await this.notificationsRepository.markAsFailed(notification.id, error.message);
    }
  }

  private async processEmailChannel(notification: NotificationEntity): Promise<void> {
    if (!notification.is_email_enabled) {
      return;
    }

    try {
      const result = await this.emailService.sendEmail({
        to: notification.recipient_email!,
        subject: notification.email_template?.subject || notification.title,
        template: notification.email_template?.template || notification.message,
        variables: notification.email_template?.variables || {},
      });

      if (!result.success) {
        throw new Error(result.error || 'Email send failed');
      }

      this.logger.log(`Email sent successfully to ${notification.recipient_email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${notification.recipient_email}:`, error);
      throw error;
    }
  }

  private async processSMSChannel(notification: NotificationEntity): Promise<void> {
    if (!notification.is_sms_enabled) {
      return;
    }

    try {
      const result = await this.smsService.sendSMS({
        to: notification.recipient_phone!,
        message: notification.sms_template?.message || notification.message,
      });

      if (!result.success) {
        throw new Error(result.error || 'SMS send failed');
      }

      this.logger.log(`SMS sent successfully to ${notification.recipient_phone}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${notification.recipient_phone}:`, error);
      throw error;
    }
  }

  private async processPushChannel(notification: NotificationEntity): Promise<void> {
    if (!notification.is_push_enabled) {
      return;
    }

    try {
      const result = await this.pushService.sendPushNotification({
        userId: notification.recipient_id!,
        title: notification.title,
        message: notification.message,
        data: notification.data,
      });

      if (!result.success) {
        throw new Error(result.error || 'Push notification failed');
      }

      this.logger.log(`Push notification sent successfully to user ${notification.recipient_id}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${notification.recipient_id}:`, error);
      throw error;
    }
  }

  private async processWebhookChannel(notification: NotificationEntity): Promise<void> {
    if (!notification.is_webhook_enabled) {
      return;
    }

    try {
      const response = await fetch(notification.webhook_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: notification.created_at,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      this.logger.log(`Webhook sent successfully to ${notification.webhook_url}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook to ${notification.webhook_url}:`, error);
      throw error;
    }
  }

  private initializeProviders(): void {
    // Mock implementations for demonstration
    // In a real implementation, these would be actual service providers
    this.emailService = {
      sendEmail: async (options) => {
        this.logger.log(`Mock email sent to ${options.to}: ${options.subject}`);
        return { success: true, messageId: 'mock-email-id' };
      },
    };

    this.smsService = {
      sendSMS: async (options) => {
        this.logger.log(`Mock SMS sent to ${options.to}: ${options.message.substring(0, 50)}...`);
        return { success: true, messageId: 'mock-sms-id' };
      },
    };

    this.pushService = {
      sendPushNotification: async (options) => {
        this.logger.log(`Mock push notification sent to user ${options.userId}: ${options.title}`);
        return { success: true, messageId: 'mock-push-id' };
      },
    };
  }
}