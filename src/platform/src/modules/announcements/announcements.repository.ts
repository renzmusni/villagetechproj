import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not, Between } from 'typeorm';
import {
  AnnouncementEntity,
  AnnouncementType,
  AnnouncementStatus,
  AnnouncementPriority,
  AnnouncementAudience,
} from './entities/announcement.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto, SearchAnnouncementsDto } from '@hoa-platform/shared';
import { NotFoundError, ValidationError } from '@hoa-platform/shared';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AnnouncementsRepository {
  constructor(
    @InjectRepository(AnnouncementEntity)
    private readonly announcementsRepository: Repository<AnnouncementEntity>,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createAnnouncementDto: Partial<AnnouncementEntity>): Promise<AnnouncementEntity> {
    // Validate author exists
    if (createAnnouncementDto.author_id) {
      const author = await this.usersRepository.findOne(createAnnouncementDto.author_id);
      if (!author) {
        throw new NotFoundError('User', createAnnouncementDto.author_id);
      }
    }

    // Validate dates
    if (createAnnouncementDto.scheduling?.publish_date && createAnnouncementDto.scheduling?.expire_date) {
      if (new Date(createAnnouncementDto.scheduling.publish_date) >= new Date(createAnnouncementDto.scheduling.expire_date)) {
        throw new ValidationError('Expire date must be after publish date');
      }
    }

    const announcement = this.announcementsRepository.create(createAnnouncementDto);

    // Auto-publish if no scheduling and status is draft
    if (!announcement.scheduling?.publish_date && announcement.status === 'draft') {
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.published_at = new Date();
    }

    // Set default values
    if (!announcement.notification_methods || announcement.notification_methods.length === 0) {
      announcement.notification_methods = ['in_app'];
    }

    if (!announcement.analytics) {
      announcement.analytics = {
        views: 0,
        unique_views: 0,
        reads: 0,
        acknowledgments: 0,
        shares: 0,
        clicks: 0,
        email_sents: 0,
        email_opens: 0,
        email_clicks: 0,
        sms_sents: 0,
        push_sents: 0,
        push_opens: 0,
      };
    }

    return await this.announcementsRepository.save(announcement);
  }

  async findAll(options: SearchAnnouncementsDto = {}, tenantId?: string): Promise<{
    announcements: AnnouncementEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      priority,
      audience,
      author_id,
      is_published,
      is_pinned,
      requires_acknowledgment,
      has_attachments,
      start_date_from,
      start_date_to,
      expire_date_from,
      expire_date_to,
      tags,
      categories,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .leftJoinAndSelect('announcement.approver', 'approver')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('announcement.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(announcement.title ILIKE :search OR announcement.content ILIKE :search OR announcement.summary ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('announcement.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('announcement.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('announcement.priority = :priority', { priority });
    }

    if (audience) {
      queryBuilder.andWhere('announcement.audience = :audience', { audience });
    }

    if (author_id) {
      queryBuilder.andWhere('announcement.author_id = :authorId', { authorId });
    }

    if (typeof is_published === 'boolean') {
      if (is_published) {
        queryBuilder.andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED });
      } else {
        queryBuilder.andWhere('announcement.status != :published', { published: AnnouncementStatus.PUBLISHED });
      }
    }

    if (typeof is_pinned === 'boolean') {
      if (is_pinned) {
        queryBuilder.andWhere('announcement.is_pinned = :isPinned', { isPinned: true });
      } else {
        queryBuilder.andWhere('(announcement.is_pinned = false OR announcement.is_pinned IS NULL)');
      }
    }

    if (typeof requires_acknowledgment === 'boolean') {
      if (requires_acknowledgment) {
        queryBuilder.andWhere('announcement.require_acknowledgment = :requiresAck', { requiresAck: true });
      } else {
        queryBuilder.andWhere('(announcement.require_acknowledgment = false OR announcement.require_acknowledgment IS NULL)');
      }
    }

    if (typeof has_attachments === 'boolean') {
      if (has_attachments) {
        queryBuilder.andWhere('announcement.attachments IS NOT NULL AND jsonb_array_length(announcement.attachments) > 0');
      } else {
        queryBuilder.andWhere('(announcement.attachments IS NULL OR jsonb_array_length(announcement.attachments) = 0)');
      }
    }

    if (start_date_from) {
      queryBuilder.andWhere('announcement.published_at >= :startDateFrom', { startDateFrom: new Date(start_date_from) });
    }

    if (start_date_to) {
      queryBuilder.andWhere('announcement.published_at <= :startDateTo', { startDateTo: new Date(start_date_to) });
    }

    if (expire_date_from) {
      queryBuilder.andWhere('announcement.expires_at >= :expireDateFrom', { expireDateFrom: new Date(expire_date_from) });
    }

    if (expire_date_to) {
      queryBuilder.andWhere('announcement.expires_at <= :expireDateTo', { expireDateTo: new Date(expire_date_to) });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('announcement.tags ?| :tags', { tags });
    }

    if (categories && categories.length > 0) {
      queryBuilder.andWhere('announcement.categories ?| :categories', { categories });
    }

    const [announcements, total] = await queryBuilder
      .orderBy('announcement.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      announcements,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.announcementsRepository.findOne({
      where: { id },
      relations: ['author', 'approver'],
    });

    if (!announcement) {
      throw new NotFoundError('Announcement', id);
    }

    return announcement;
  }

  async findByAuthor(authorId: string, options: SearchAnnouncementsDto = {}): Promise<{
    announcements: AnnouncementEntity[];
    total: number;
  }> {
    const { status, is_published } = options;

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.author_id = :authorId', { authorId });

    if (status) {
      queryBuilder.andWhere('announcement.status = :status', { status });
    }

    if (typeof is_published === 'boolean') {
      if (is_published) {
        queryBuilder.andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED });
      } else {
        queryBuilder.andWhere('announcement.status != :published', { published: AnnouncementStatus.PUBLISHED });
      }
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [announcements, total] = await queryBuilder
      .orderBy('announcement.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { announcements, total };
  }

  async findByTenant(tenantId: string, options: SearchAnnouncementsDto = {}): Promise<{
    announcements: AnnouncementEntity[];
    total: number;
  }> {
    const { status, is_published, is_pinned, type, audience } = options;

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .leftJoinAndSelect('announcement.approver', 'approver')
      .where('announcement.tenant_id = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('announcement.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('announcement.type = :type', { type });
    }

    if (audience) {
      queryBuilder.andWhere('announcement.audience = :audience', { audience });
    }

    if (typeof is_published === 'boolean') {
      if (is_published) {
        queryBuilder.andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED });
      } else {
        queryBuilder.andWhere('announcement.status != :published', { published: AnnouncementStatus.PUBLISHED });
      }
    }

    if (typeof is_pinned === 'boolean') {
      if (is_pinned) {
        queryBuilder.andWhere('announcement.is_pinned = :isPinned', { isPinned: true });
      } else {
        queryBuilder.andWhere('(announcement.is_pinned = false OR announcement.is_pinned IS NULL)');
      }
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [announcements, total] = await queryBuilder
      .orderBy('announcement.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { announcements, total };
  }

  async getActiveAnnouncements(tenantId: string, options: {
    userId?: string;
    userRoles?: string[];
    householdId?: string;
    limit?: number;
    includePinned?: boolean;
  } = {}): Promise<AnnouncementEntity[]> {
    const { userId, userRoles = [], householdId, limit = 50, includePinned = true } = options;

    const now = new Date();

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.tenant_id = :tenantId', { tenantId })
      .andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED })
      .andWhere('(announcement.expires_at IS NULL OR announcement.expires_at > :now)', { now });

    // Filter by audience targeting
    queryBuilder.andWhere(
      '(announcement.audience = :allResidents OR ' +
      '(announcement.audience = :specificUsers AND :userId = ANY (SELECT jsonb_array_elements_text(announcement.targeting->\'user_ids\')::uuid)) OR ' +
      '(announcement.audience = :specificHouseholds AND :householdId = ANY (SELECT jsonb_array_elements_text(announcement.targeting->\'household_ids\')::uuid)) OR ' +
      '(announcement.audience = :boardMembers AND :boardRole = ANY (SELECT jsonb_array_elements_text(announcement.targeting->\'user_roles\'))))',
      {
        allResidents: AnnouncementAudience.ALL_RESIDENTS,
        specificUsers: AnnouncementAudience.SPECIFIC_USERS,
        specificHouseholds: AnnouncementAudience.SPECIFIC_HOUSEHOLDS,
        boardMembers: AnnouncementAudience.BOARD_MEMBERS,
        userId,
        householdId,
        boardRole: 'board_member',
      }
    );

    // Order by pinned status, priority, and publish date
    if (includePinned) {
      queryBuilder
        .orderBy('announcement.is_pinned', 'DESC')
        .addOrderBy('announcement.priority', 'DESC')
        .addOrderBy('announcement.published_at', 'DESC');
    } else {
      queryBuilder
        .orderBy('announcement.priority', 'DESC')
        .addOrderBy('announcement.published_at', 'DESC');
    }

    return await queryBuilder
      .limit(limit)
      .getMany();
  }

  async getPinnedAnnouncements(tenantId: string): Promise<AnnouncementEntity[]> {
    const now = new Date();

    return await this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.tenant_id = :tenantId', { tenantId })
      .andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED })
      .andWhere('announcement.is_pinned = :isPinned', { isPinned: true })
      .andWhere('(announcement.expires_at IS NULL OR announcement.expires_at > :now)', { now })
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.published_at', 'DESC')
      .getMany();
  }

  async getEmergencyAnnouncements(tenantId: string): Promise<AnnouncementEntity[]> {
    const now = new Date();

    return await this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.tenant_id = :tenantId', { tenantId })
      .andWhere('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED })
      .andWhere('announcement.is_emergency = :isEmergency', { isEmergency: true })
      .andWhere('(announcement.expires_at IS NULL OR announcement.expires_at > :now)', { now })
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.published_at', 'DESC')
      .getMany();
  }

  async getExpiredAnnouncements(): Promise<AnnouncementEntity[]> {
    const now = new Date();

    return await this.announcementsRepository
      .createQueryBuilder('announcement')
      .where('announcement.status = :published', { published: AnnouncementStatus.PUBLISHED })
      .andWhere('announcement.expires_at IS NOT NULL')
      .andWhere('announcement.expires_at <= :now', { now })
      .getMany();
  }

  async getScheduledAnnouncements(): Promise<AnnouncementEntity[]> {
    const now = new Date();

    return await this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.status = :scheduled', { scheduled: AnnouncementStatus.SCHEDULED })
      .andWhere('announcement.scheduling->>\'publish_date\' <= :now', { now })
      .getMany();
  }

  async getAnnouncementsRequiringApproval(tenantId: string): Promise<AnnouncementEntity[]> {
    return await this.announcementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.tenant_id = :tenantId', { tenantId })
      .andWhere('announcement.requires_approval = :requiresApproval', { requiresApproval: true })
      .andWhere('announcement.approved_by IS NULL')
      .andWhere('announcement.status != :cancelled', { cancelled: AnnouncementStatus.CANCELLED })
      .getMany();
  }

  async update(id: string, updateAnnouncementDto: UpdateAnnouncementDto): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    // Validate dates if being updated
    if (updateAnnouncementDto.scheduling?.publish_date && updateAnnouncementDto.scheduling?.expire_date) {
      if (new Date(updateAnnouncementDto.scheduling.publish_date) >= new Date(updateAnnouncementDto.scheduling.expire_date)) {
        throw new ValidationError('Expire date must be after publish date');
      }
    }

    Object.assign(announcement, updateAnnouncementDto);

    return await this.announcementsRepository.save(announcement);
  }

  async updateStatus(id: string, status: AnnouncementStatus, updatedBy?: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.status = status;

    // Handle status-specific logic
    switch (status) {
      case AnnouncementStatus.PUBLISHED:
        if (!announcement.published_at) {
          announcement.published_at = new Date();
        }
        break;

      case AnnouncementStatus.EXPIRED:
        announcement.expires_at = new Date();
        break;

      case AnnouncementStatus.ARCHIVED:
        announcement.archived_at = new Date();
        break;
    }

    return await this.announcementsRepository.save(announcement);
  }

  async approve(id: string, approvedBy: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.approve(approvedBy);

    return await this.announcementsRepository.save(announcement);
  }

  async reject(id: string, reason: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.reject(reason);

    return await this.announcementsRepository.save(announcement);
  }

  async publish(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.publish();

    return await this.announcementsRepository.save(announcement);
  }

  async schedule(id: string, publishDate: Date, expireDate?: Date): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.schedule(publishDate, expireDate);

    return await this.announcementsRepository.save(announcement);
  }

  async archive(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.archive();

    return await this.announcementsRepository.save(announcement);
  }

  async cancel(id: string, reason: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.cancel(reason);

    return await this.announcementsRepository.save(announcement);
  }

  async recordEngagement(id: string, engagementData: {
    action: 'view' | 'read' | 'acknowledge' | 'share' | 'click';
    userId?: string;
  }): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    switch (engagementData.action) {
      case 'view':
        announcement.view(engagementData.userId);
        break;
      case 'read':
        announcement.read(engagementData.userId);
        break;
      case 'acknowledge':
        announcement.acknowledge(engagementData.userId);
        break;
      case 'share':
        announcement.share();
        break;
      case 'click':
        announcement.click();
        break;
    }

    return await this.announcementsRepository.save(announcement);
  }

  async addComment(id: string, commentData: {
    id: string;
    user_id: string;
    user_name: string;
    content: string;
  }): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.addComment(commentData);

    return await this.announcementsRepository.save(announcement);
  }

  async addReaction(id: string, reactionType: string, userId: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.addReaction(reactionType, userId);

    return await this.announcementsRepository.save(announcement);
  }

  async pin(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.pin();

    return await this.announcementsRepository.save(announcement);
  }

  async unpin(id: string): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.unpin();

    return await this.announcementsRepository.save(announcement);
  }

  async extendExpiry(id: string, newExpiryDate: Date): Promise<AnnouncementEntity> {
    const announcement = await this.findOne(id);

    announcement.extendExpiry(newExpiryDate);

    return await this.announcementsRepository.save(announcement);
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementsRepository.remove(announcement);
  }

  // Statistics and analytics
  async getStatistics(tenantId?: string, days: number = 30): Promise<{
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    expired: number;
    archived: number;
    by_type: Record<AnnouncementType, number>;
    by_priority: Record<AnnouncementPriority, number>;
    by_audience: Record<AnnouncementAudience, number>;
    total_views: number;
    total_reads: number;
    total_acknowledgments: number;
    total_shares: number;
    engagement_rate: number;
    most_viewed: AnnouncementEntity;
    most_engaged: AnnouncementEntity;
  }> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .where('announcement.created_at >= :since', { since });

    if (tenantId) {
      queryBuilder.andWhere('announcement.tenant_id = :tenantId', { tenantId });
    }

    const announcements = await queryBuilder.getMany();

    const stats = {
      total: announcements.length,
      published: 0,
      scheduled: 0,
      draft: 0,
      expired: 0,
      archived: 0,
      by_type: {} as Record<AnnouncementType, number>,
      by_priority: {} as Record<AnnouncementPriority, number>,
      by_audience: {} as Record<AnnouncementAudience, number>,
      total_views: 0,
      total_reads: 0,
      total_acknowledgments: 0,
      total_shares: 0,
      engagement_rate: 0,
      most_viewed: null as AnnouncementEntity | null,
      most_engaged: null as AnnouncementEntity | null,
    };

    let maxViews = 0;
    let maxEngagement = 0;

    announcements.forEach(announcement => {
      // Count by status
      switch (announcement.status) {
        case AnnouncementStatus.PUBLISHED:
          stats.published++;
          break;
        case AnnouncementStatus.SCHEDULED:
          stats.scheduled++;
          break;
        case AnnouncementStatus.DRAFT:
          stats.draft++;
          break;
        case AnnouncementStatus.EXPIRED:
          stats.expired++;
          break;
        case AnnouncementStatus.ARCHIVED:
          stats.archived++;
          break;
      }

      // Count by type
      stats.by_type[announcement.type] = (stats.by_type[announcement.type] || 0) + 1;

      // Count by priority
      stats.by_priority[announcement.priority] = (stats.by_priority[announcement.priority] || 0) + 1;

      // Count by audience
      stats.by_audience[announcement.audience] = (stats.by_audience[announcement.audience] || 0) + 1;

      // Sum engagement metrics
      if (announcement.analytics) {
        stats.total_views += announcement.analytics.views;
        stats.total_reads += announcement.analytics.reads;
        stats.total_acknowledgments += announcement.analytics.acknowledgments;
        stats.total_shares += announcement.analytics.shares;

        if (announcement.analytics.views > maxViews) {
          maxViews = announcement.analytics.views;
          stats.most_viewed = announcement;
        }
      }

      const engagement = announcement.total_engagement;
      if (engagement > maxEngagement) {
        maxEngagement = engagement;
        stats.most_engaged = announcement;
      }
    });

    // Calculate engagement rate
    if (stats.total_views > 0) {
      stats.engagement_rate = ((stats.total_reads + stats.total_acknowledgments) / stats.total_views) * 100;
    }

    return stats;
  }

  async getPopularTags(tenantId?: string, limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const queryBuilder = this.announcementsRepository
      .createQueryBuilder('announcement')
      .select('jsonb_array_elements_text(announcement.tags)', 'tag')
      .addSelect('COUNT(*)', 'count');

    if (tenantId) {
      queryBuilder.where('announcement.tenant_id = :tenantId', { tenantId });
    }

    const result = await queryBuilder
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(row => ({
      tag: row.tag,
      count: parseInt(row.count),
    }));
  }

  async cleanupOldAnnouncements(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

    const result = await this.announcementsRepository
      .createQueryBuilder()
      .delete()
      .from(AnnouncementEntity)
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('status IN (:...statuses)', {
        statuses: [AnnouncementStatus.ARCHIVED, AnnouncementStatus.CANCELLED],
      })
      .execute();

    return result.affected || 0;
  }
}