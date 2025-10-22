import { Injectable } from '@nestjs/common';
import { GuestsRepository } from './guests.repository';
import { CreateGuestDto, UpdateGuestDto, SearchGuestsDto, GuestEntity } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class GuestsService {
  constructor(
    private readonly guestsRepository: GuestsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createGuestDto: CreateGuestDto): Promise<GuestEntity> {
    const guest = await this.guestsRepository.create(createGuestDto);

    // Send notifications if enabled
    if (guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'created');
    }

    // If auto-approval is enabled and guest doesn't require approval
    if (!guest.requires_approval && guest.is_pending) {
      await this.autoApproveGuest(guest.id, 'system');
    }

    return guest;
  }

  async findAll(options: SearchGuestsDto = {}, tenantId?: string): Promise<{
    guests: GuestEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.guestsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<GuestEntity> {
    return await this.guestsRepository.findOne(id);
  }

  @Audit('update', 'guest')
  async update(id: string, updateGuestDto: UpdateGuestDto): Promise<GuestEntity> {
    const guest = await this.guestsRepository.update(id, updateGuestDto);

    // Send notifications if status changed
    if (updateGuestDto.status && guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'status_updated');
    }

    return guest;
  }

  @Audit('delete', 'guest')
  async remove(id: string): Promise<void> {
    await this.guestsRepository.remove(id);
  }

  async approve(id: string, approvedBy: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.approve(id, approvedBy);

    // Send approval notifications
    if (guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'approved');
    }

    // Send SMS notification if phone number provided
    if (guest.phone) {
      await this.sendSMSNotification(guest, 'approved');
    }

    return guest;
  }

  async reject(id: string, reason: string, rejectedBy: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.reject(id, reason, rejectedBy);

    // Send rejection notifications
    if (guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'rejected');
    }

    return guest;
  }

  async checkIn(id: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.checkIn(id);

    // Send check-in notifications
    if (guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'checked_in');
    }

    // Notify household about guest arrival
    await this.notifyHouseholdGuestArrival(guest);

    return guest;
  }

  async checkOut(id: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.checkOut(id);

    // Send check-out notifications
    if (guest.send_notifications && guest.notification_emails?.length > 0) {
      await this.sendGuestNotifications(guest, 'checked_out');
    }

    return guest;
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.blacklist(id, reason, blacklistedBy);

    // Log blacklist action for audit
    await this.auditService.log({
      action: 'blacklist',
      entity_type: 'guest',
      entity_id: guest.id,
      tenant_id: guest.household?.tenant_id,
      user_id: blacklistedBy,
      details: { reason },
    });

    return guest;
  }

  async removeFromBlacklist(id: string, removedBy: string): Promise<GuestEntity> {
    const guest = await this.guestsRepository.removeFromBlacklist(id, removedBy);

    // Log removal from blacklist
    await this.auditService.log({
      action: 'unblacklist',
      entity_type: 'guest',
      entity_id: guest.id,
      tenant_id: guest.household?.tenant_id,
      user_id: removedBy,
    });

    return guest;
  }

  async findByEmail(email: string): Promise<GuestEntity | null> {
    return await this.guestsRepository.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<GuestEntity | null> {
    return await this.guestsRepository.findByPhone(phone);
  }

  async findByHousehold(householdId: string, options: SearchGuestsDto = {}): Promise<{
    guests: GuestEntity[];
    total: number;
  }> {
    return await this.guestsRepository.findByHousehold(householdId, options);
  }

  async findByTenant(tenantId: string, options: SearchGuestsDto = {}): Promise<{
    guests: GuestEntity[];
    total: number;
  }> {
    return await this.guestsRepository.findByTenant(tenantId, options);
  }

  async getPendingApprovals(tenantId: string): Promise<GuestEntity[]> {
    return await this.guestsRepository.getPendingApprovals(tenantId);
  }

  async getActiveGuests(tenantId: string): Promise<GuestEntity[]> {
    return await this.guestsRepository.getActiveGuests(tenantId);
  }

  async getOverstayingGuests(tenantId: string): Promise<GuestEntity[]> {
    const overstayingGuests = await this.guestsRepository.getOverstayingGuests(tenantId);

    // Send notifications for overstaying guests
    for (const guest of overstayingGuests) {
      await this.notifyOverstayingGuest(guest);
    }

    return overstayingGuests;
  }

  async getExpectedArrivals(date: Date, tenantId?: string): Promise<GuestEntity[]> {
    return await this.guestsRepository.getExpectedArrivals(date, tenantId);
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    checked_in: number;
    blacklisted: number;
    expected_today: number;
    overstaying: number;
    with_vehicles: number;
    recurring: number;
  }> {
    return await this.guestsRepository.getStatistics(tenantId);
  }

  async preRegisterGuest(createGuestDto: CreateGuestDto): Promise<GuestEntity> {
    // Set default values for pre-registered guests
    const guestData = {
      ...createGuestDto,
      status: 'PENDING',
      requires_approval: true,
    };

    const guest = await this.create(guestData);

    // Send pre-registration notification to household
    await this.notifyHouseholdGuestPreRegistration(guest);

    return guest;
  }

  async extendGuestStay(id: string, newDepartureDate: Date, extendedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    if (!guest.can_extend) {
      throw new Error('Guest stay cannot be extended');
    }

    return await this.update(id, {
      expected_departure: newDepartureDate,
      last_updated_by: extendedBy,
    });
  }

  async updateGuestNotes(id: string, notes: string, updatedBy: string): Promise<GuestEntity> {
    return await this.update(id, {
      notes,
      last_updated_by: updatedBy,
    });
  }

  async addGuestVehicle(
    id: string,
    vehicleInfo: {
      vehicle_make: string;
      vehicle_model: string;
      vehicle_color?: string;
      license_plate: string;
    },
    updatedBy: string,
  ): Promise<GuestEntity> {
    return await this.update(id, {
      ...vehicleInfo,
      last_updated_by: updatedBy,
    });
  }

  async removeGuestVehicle(id: string, updatedBy: string): Promise<GuestEntity> {
    return await this.update(id, {
      vehicle_make: null,
      vehicle_model: null,
      vehicle_color: null,
      license_plate: null,
      last_updated_by: updatedBy,
    });
  }

  async regenerateAccessCode(id: string, regeneratedBy: string): Promise<GuestEntity> {
    const guest = await this.findOne(id);

    // Generate new access code
    const accessCode = this.generateAccessCode();

    return await this.update(id, {
      access_code: accessCode,
      last_updated_by: regeneratedBy,
    });
  }

  async validateAccessCode(accessCode: string): Promise<GuestEntity | null> {
    // Find guest by access code
    const guests = await this.guestsRepository.findAll({ limit: 1000 });
    const guest = guests.guests.find(g => g.access_code === accessCode);

    if (!guest) {
      return null;
    }

    // Check if access code is still valid
    if (!guest.is_active) {
      return null;
    }

    return guest;
  }

  async bulkApprove(guestIds: string[], approvedBy: string): Promise<GuestEntity[]> {
    const approvedGuests: GuestEntity[] = [];

    for (const guestId of guestIds) {
      try {
        const guest = await this.approve(guestId, approvedBy);
        approvedGuests.push(guest);
      } catch (error) {
        // Log error but continue with other guests
        console.error(`Failed to approve guest ${guestId}:`, error);
      }
    }

    return approvedGuests;
  }

  async bulkReject(guestIds: string[], reason: string, rejectedBy: string): Promise<GuestEntity[]> {
    const rejectedGuests: GuestEntity[] = [];

    for (const guestId of guestIds) {
      try {
        const guest = await this.reject(guestId, reason, rejectedBy);
        rejectedGuests.push(guest);
      } catch (error) {
        // Log error but continue with other guests
        console.error(`Failed to reject guest ${guestId}:`, error);
      }
    }

    return rejectedGuests;
  }

  async exportGuestList(tenantId: string, options: SearchGuestsDto = {}): Promise<{
    guests: GuestEntity[];
    exportDate: Date;
    total: number;
  }> {
    const result = await this.guestsRepository.findByTenant(tenantId, options);

    return {
      guests: result.guests,
      exportDate: new Date(),
      total: result.total,
    };
  }

  private async autoApproveGuest(guestId: string, approvedBy: string): Promise<void> {
    try {
      await this.approve(guestId, approvedBy);
    } catch (error) {
      console.error(`Failed to auto-approve guest ${guestId}:`, error);
    }
  }

  private async sendGuestNotifications(guest: GuestEntity, action: string): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: 'guest',
        action,
        recipient_emails: guest.notification_emails || [],
        data: {
          guest_id: guest.id,
          guest_name: guest.full_name,
          household_id: guest.household_id,
          status: guest.status,
          expected_arrival: guest.expected_arrival,
          expected_departure: guest.expected_departure,
        },
      });
    } catch (error) {
      console.error(`Failed to send ${action} notification for guest ${guest.id}:`, error);
    }
  }

  private async sendSMSNotification(guest: GuestEntity, action: string): Promise<void> {
    try {
      await this.notificationsService.sendSMS({
        phone_number: guest.phone!,
        message: this.getSMSMessage(guest, action),
      });
    } catch (error) {
      console.error(`Failed to send SMS notification for guest ${guest.id}:`, error);
    }
  }

  private async notifyHouseholdGuestArrival(guest: GuestEntity): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: 'household',
        action: 'guest_arrival',
        household_id: guest.household_id,
        data: {
          guest_name: guest.full_name,
          arrival_time: guest.checked_in_at,
        },
      });
    } catch (error) {
      console.error(`Failed to notify household about guest arrival ${guest.id}:`, error);
    }
  }

  private async notifyHouseholdGuestPreRegistration(guest: GuestEntity): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: 'household',
        action: 'guest_pre_registration',
        household_id: guest.household_id,
        data: {
          guest_name: guest.full_name,
          expected_arrival: guest.expected_arrival,
          requires_approval: guest.requires_approval,
        },
      });
    } catch (error) {
      console.error(`Failed to notify household about guest pre-registration ${guest.id}:`, error);
    }
  }

  private async notifyOverstayingGuest(guest: GuestEntity): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: 'household',
        action: 'guest_overstaying',
        household_id: guest.household_id,
        data: {
          guest_name: guest.full_name,
          expected_departure: guest.expected_departure,
          overstaying_duration: guest.visit_duration_hours,
        },
      });
    } catch (error) {
      console.error(`Failed to notify about overstaying guest ${guest.id}:`, error);
    }
  }

  private getSMSMessage(guest: GuestEntity, action: string): string {
    switch (action) {
      case 'approved':
        return `Your visit to ${guest.household?.address || 'the community'} has been approved. Access code: ${guest.access_code}`;
      case 'rejected':
        return `Your visit request has been rejected. Reason: ${guest.rejection_reason || 'Not specified'}`;
      case 'checked_in':
        return `You have been checked in. Welcome!`;
      default:
        return `Your guest status has been updated.`;
    }
  }

  private generateAccessCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}