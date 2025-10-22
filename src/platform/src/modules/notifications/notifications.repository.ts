import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not, Between } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from './entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto, SearchNotificationsDto } from '@hoa-platform/shared';
import { NotFoundError, ValidationError } from '@hoa-platform/shared';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationsRepository: Repository<NotificationEntity>,
  ) {}

  async create(createNotificationDto: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const notification = this.notificationsRepository.create(createNotificationDto);

    // Set default values
    if (!notification.channels || notification.channels.length === 0) {
      notification.channels = [NotificationChannel.IN_APP];
    }

    if (!notification.priority) {
      notification.priority = NotificationPriority.NORMAL;
    }

    if (!notification.status) {
      notification.status = NotificationStatus.PENDING;
    }

    return await this.notificationsRepository.save(notification);
  }

  async findAll(options: SearchNotificationsDto = {}, recipientId?: string): Promise<{
    notifications: NotificationEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      priority,
      channel,
      is_read,
      is_scheduled,
      sender_id,
      start_date,
      end_date,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.sender', 'sender')
      .leftJoinAndSelect('notification.household', 'household')
      .where('1=1');

    // Filter by recipient
    if (recipientId) {
      queryBuilder.andWhere('notification.recipient_id = :recipientId', { recipientId });
    }

    // Filter by type
    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('notification.status = :status', { status });
    }

    // Filter by priority
    if (priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority });
    }

    // Filter by channel
    if (channel) {
      queryBuilder.andWhere(':channel = ANY(notification.channels)', { channel });
    }

    // Filter by read status
    if (typeof is_read === 'boolean') {
      queryBuilder.andWhere('notification.is_read = :isRead', { isRead });
    }

    // Filter by scheduled status
    if (typeof is_scheduled === 'boolean') {
      if (is_scheduled) {
        queryBuilder.andWhere('notification.is_scheduled = :isScheduled', { isScheduled: true });
      } else {
        queryBuilder.andWhere('(notification.is_scheduled = false OR notification.is_scheduled IS NULL)');
      }
    }

    // Filter by sender
    if (sender_id) {
      queryBuilder.andWhere('notification.sender_id = :senderId', { senderId });
    }

    // Filter by date range
    if (start_date) {
      queryBuilder.andWhere('notification.created_at >= :startDate', { startDate: new Date(start_date) });
    }

    if (end_date) {
      queryBuilder.andWhere('notification.created_at <= :endDate', { endDate: new Date(end_date) });
    }

    const [notifications, total] = await queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<NotificationEntity> {
    const notification = await this.notificationsRepository.findOne({
      where: { id },
      relations: ['recipient', 'sender', 'household'],
    });

    if (!notification) {
      throw new NotFoundError('Notification', id);
    }

    return notification;
  }

  async findByRecipient(
    recipientId: string,
    options: SearchNotificationsDto = {},
  ): Promise<{
    notifications: NotificationEntity[];
    total: number;
    unread_count: number;
  }> {
    const result = await this.findAll(options, recipientId);

    // Count unread notifications
    const unreadCount = await this.notificationsRepository.count({
      where: {
        recipient_id: recipientId,
        is_read: false,
        status: Not(NotificationStatus.FAILED),
      },
    });

    return {
      notifications: result.notifications,
      total: result.total,
      unread_count: unreadCount,
    };
  }

  async findByHousehold(householdId: string, options: SearchNotificationsDto = {}): Promise<{
    notifications: NotificationEntity[];
    total: number;
  }> {
    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.sender', 'sender')
      .where('notification.household_id = :householdId', { householdId });

    // Apply filters
    if (options.type) {
      queryBuilder.andWhere('notification.type = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('notification.status = :status', { status: options.status });
    }

    if (options.priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority: options.priority });
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [notifications, total] = await queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { notifications, total };
  }

  async findByTenant(tenantId: string, options: SearchNotificationsDto = {}): Promise<{
    notifications: NotificationEntity[];
    total: number;
  }> {
    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('notification.sender', 'sender')
      .leftJoinAndSelect('notification.household', 'household')
      .where('notification.tenant_id = :tenantId', { tenantId });

    // Apply filters
    if (options.type) {
      queryBuilder.andWhere('notification.type = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('notification.status = :status', { status: options.status });
    }

    if (options.priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority: options.priority });
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [notifications, total] = await queryBuilder
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { notifications, total };
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    Object.assign(notification, updateNotificationDto);
    return await this.notificationsRepository.save(notification);
  }

  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationsRepository.remove(notification);
  }

  async markAsRead(id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    notification.markAsRead();
    return await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.notificationsRepository.update(
      {
        recipient_id: recipientId,
        is_read: false,
        status: Not(NotificationStatus.FAILED),
      },
      {
        is_read: true,
        status: NotificationStatus.READ,
        read_at: new Date(),
        updated_at: new Date(),
      },
    );

    return result.affected || 0;
  }

  async markAsDelivered(id: string, deliveryResponse?: any): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    notification.markAsDelivered();
    if (deliveryResponse) {
      notification.delivery_response = deliveryResponse;
    }
    return await this.notificationsRepository.save(notification);
  }

  async markAsFailed(id: string, errorMessage: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    notification.markAsFailed(errorMessage);
    return await this.notificationsRepository.save(notification);
  }

  async cancel(id: string): Promise<NotificationEntity> {
    const notification = await this.findOne(id);
    notification.cancel();
    return await this.notificationsRepository.save(notification);
  }

  // Scheduled notifications
  async getScheduledNotifications(): Promise<NotificationEntity[]> {
    const now = new Date();

    return await this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.is_scheduled = :isScheduled', { isScheduled: true })
      .andWhere('notification.scheduled_at <= :now', { now })
      .andWhere('notification.status = :status', { status: NotificationStatus.PENDING })
      .orderBy('notification.scheduled_at', 'ASC')
      .getMany();
  }

  async scheduleNotification(
    id: string,
    scheduledDate: Date,
  ): Promise<NotificationEntity> {
    const notification = await this.findOne(id);

    if (scheduledDate <= new Date()) {
      throw new ValidationError('Scheduled date must be in the future');
    }

    notification.scheduleFor(scheduledDate);
    return await this.notificationsRepository.save(notification);
  }

  async getRetryableNotifications(): Promise<NotificationEntity[]> {
    const now = new Date();

    return await this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('notification.retry_count < notification.max_retries')
      .andWhere('(notification.next_retry_at IS NULL OR notification.next_retry_at <= :now)', { now })
      .orderBy('notification.next_retry_at', 'ASC')
      .getMany();
  }

  async getExpiredNotifications(): Promise<NotificationEntity[]> {
    const now = new Date();

    return await this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.expires_at IS NOT NULL')
      .andWhere('notification.expires_at <= :now', { now })
      .andWhere('notification.status IN (:...statuses)', {
        statuses: [NotificationStatus.PENDING, NotificationStatus.SENT, NotificationStatus.DELIVERED],
      })
      .getMany();
  }

  async getFailedNotifications(hours: number = 24): Promise<NotificationEntity[]> {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

    return await this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', { status: NotificationStatus.FAILED })
      .andWhere('notification.updated_at >= :since', { since })
      .orderBy('notification.updated_at', 'DESC')
      .getMany();
  }

  // Statistics and analytics
  async getStatistics(tenantId?: string, days: number = 30): Promise<{
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    by_type: Record<NotificationType, number>;
    by_priority: Record<NotificationPriority, number>;
    by_channel: Record<NotificationChannel, number>;
    delivery_rate: number;
    read_rate: number;
  }> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.created_at >= :since', { since });

    if (tenantId) {
      queryBuilder.andWhere('notification.tenant_id = :tenantId', { tenantId });
    }

    const notifications = await queryBuilder.getMany();

    const stats = {
      total: notifications.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      pending: 0,
      by_type: {} as Record<NotificationType, number>,
      by_priority: {} as Record<NotificationPriority, number>,
      by_channel: {} as Record<NotificationChannel, number>,
      delivery_rate: 0,
      read_rate: 0,
    };

    notifications.forEach(notification => {
      // Count by status
      switch (notification.status) {
        case NotificationStatus.SENT:
          stats.sent++;
          break;
        case NotificationStatus.DELIVERED:
          stats.delivered++;
          break;
        case NotificationStatus.READ:
          stats.read++;
          break;
        case NotificationStatus.FAILED:
          stats.failed++;
          break;
        case NotificationStatus.PENDING:
          stats.pending++;
          break;
      }

      // Count by type
      stats.by_type[notification.type] = (stats.by_type[notification.type] || 0) + 1;

      // Count by priority
      stats.by_priority[notification.priority] = (stats.by_priority[notification.priority] || 0) + 1;

      // Count by channel
      notification.channels.forEach(channel => {
        stats.by_channel[channel] = (stats.by_channel[channel] || 0) + 1;
      });
    });

    // Calculate rates
    const totalDeliverable = stats.sent + stats.delivered + stats.read;
    if (totalDeliverable > 0) {
      stats.delivery_rate = ((stats.delivered + stats.read) / totalDeliverable) * 100;
    }

    const totalDelivered = stats.delivered + stats.read;
    if (totalDelivered > 0) {
      stats.read_rate = (stats.read / totalDelivered) * 100;
    }

    return stats;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return await this.notificationsRepository.count({
      where: {
        recipient_id: recipientId,
        is_read: false,
        status: Not(NotificationStatus.FAILED),
      },
    });
  }

  async getNotificationTrends(tenantId?: string, days: number = 30): Promise<{
    date: string;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }[]> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const trends: Array<{ date: string; sent: number; delivered: number; read: number; failed: number }> = [];

    // Initialize trends for each day
    for (let i = 0; i < days; i++) {
      const date = new Date(since.getTime() + (i * 24 * 60 * 60 * 1000));
      trends.push({
        date: date.toISOString().split('T')[0],
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      });
    }

    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .select('DATE(notification.created_at)', 'date')
      .addSelect('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('notification.created_at >= :since', { since });

    if (tenantId) {
      queryBuilder.andWhere('notification.tenant_id = :tenantId', { tenantId });
    }

    const results = await queryBuilder
      .groupBy('DATE(notification.created_at), notification.status')
      .getRawMany();

    // Fill trends with actual data
    results.forEach(result => {
      const trend = trends.find(t => t.date === result.date);
      if (trend) {
        switch (result.status) {
          case NotificationStatus.SENT:
            trend.sent = parseInt(result.count);
            break;
          case NotificationStatus.DELIVERED:
            trend.delivered = parseInt(result.count);
            break;
          case NotificationStatus.READ:
            trend.read = parseInt(result.count);
            break;
          case NotificationStatus.FAILED:
            trend.failed = parseInt(result.count);
            break;
        }
      }
    });

    return trends;
  }

  // Bulk operations
  async bulkMarkAsRead(notificationIds: string[]): Promise<number> {
    const result = await this.notificationsRepository.update(
      { id: { $in: notificationIds } as any },
      {
        is_read: true,
        status: NotificationStatus.READ,
        read_at: new Date(),
        updated_at: new Date(),
      },
    );

    return result.affected || 0;
  }

  async bulkCancel(notificationIds: string[]): Promise<number> {
    const result = await this.notificationsRepository.update(
      { id: { $in: notificationIds } as any },
      {
        status: NotificationStatus.CANCELLED,
        updated_at: new Date(),
      },
    );

    return result.affected || 0;
  }

  async cleanupOldNotifications(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

    const result = await this.notificationsRepository
      .createQueryBuilder()
      .delete()
      .from(NotificationEntity)
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('status IN (:...statuses)', {
        statuses: [NotificationStatus.READ, NotificationStatus.DELIVERED, NotificationStatus.CANCELLED],
      })
      .execute();

    return result.affected || 0;
  }
}