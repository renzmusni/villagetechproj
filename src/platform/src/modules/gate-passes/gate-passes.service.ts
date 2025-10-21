import { Injectable } from '@nestjs/common';
import { GatePassesRepository } from './gate-passes.repository';
import { CreateGatePassDto, UpdateGatePassDto, SearchGatePassesDto, GatePassEntity } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit, TenantRequired } from '@hoa-platform/shared';
import { NotificationService } from '@hoa-platform/shared';

@Injectable()
export class GatePassesService {
  constructor(
    private readonly gatePassesRepository: GatePassesRepository,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createGatePassDto: CreateGatePassDto): Promise<GatePassEntity> {
    const gatePass = await this.gatePassesRepository.create(createGatePassDto);

    // Send notification if requested
    if (gatePass.send_notifications && gatePass.notification_emails?.length > 0) {
      await this.sendPassCreatedNotification(gatePass);
    }

    return gatePass;
  }

  async findAll(options: SearchGatePassesDto = {}, tenantId?: string): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.gatePassesRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<GatePassEntity> {
    return await this.gatePassesRepository.findOne(id);
  }

  @Audit('update', 'gate_pass')
  async update(id: string, updateGatePassDto: UpdateGatePassDto): Promise<GatePassEntity> {
    return await this.gatePassesRepository.update(id, updateGatePassDto);
  }

  @Audit('delete', 'gate_pass')
  async remove(id: string): Promise<void> {
    return await this.gatePassesRepository.remove(id);
  }

  async activate(id: string): Promise<GatePassEntity> {
    return await this.gatePassesRepository.activate(id);
  }

  async deactivate(id: string): Promise<GatePassEntity> {
    return await this.gatePassesRepository.deactivate(id);
  }

  @Audit('revoke', 'gate_pass')
  async revoke(id: string, revokedBy: string, reason?: string): Promise<GatePassEntity> {
    const gatePass = await this.gatePassesRepository.revoke(id, revokedBy, reason);

    // Send revocation notification
    if (gatePass.send_notifications && gatePass.notification_emails?.length > 0) {
      await this.sendPassRevokedNotification(gatePass, reason);
    }

    return gatePass;
  }

  async validateAccess(qrCodeData: string, entryPoint: string): Promise<{
    valid: boolean;
    gatePass?: GatePassEntity;
    reason?: string;
  }> {
    try {
      const gatePass = await this.gatePassesRepository.findByQRCode(qrCodeData);

      if (!gatePass) {
        return { valid: false, reason: 'Invalid QR code' };
      }

      if (!gatePass.is_valid) {
        if (gatePass.is_expired) {
          return { valid: false, gatePass, reason: 'Pass has expired' };
        }
        if (gatePass.status !== 'active') {
          return { valid: false, gatePass, reason: 'Pass is not active' };
        }
        if (gatePass.entries_remaining === 0) {
          return { valid: false, gatePass, reason: 'Pass has reached maximum entries' };
        }
        return { valid: false, gatePass, reason: 'Pass is not valid' };
      }

      // Record usage
      await this.gatePassesRepository.recordUsage(gatePass.id, entryPoint);

      return { valid: true, gatePass };
    } catch (error) {
      return { valid: false, reason: 'Error validating access' };
    }
  }

  async validateAccessByBarcode(barcode: string, entryPoint: string): Promise<{
    valid: boolean;
    gatePass?: GatePassEntity;
    reason?: string;
  }> {
    try {
      const gatePass = await this.gatePassesRepository.findByBarcode(barcode);

      if (!gatePass) {
        return { valid: false, reason: 'Invalid barcode' };
      }

      if (!gatePass.is_valid) {
        if (gatePass.is_expired) {
          return { valid: false, gatePass, reason: 'Pass has expired' };
        }
        if (gatePass.status !== 'active') {
          return { valid: false, gatePass, reason: 'Pass is not active' };
        }
        if (gatePass.entries_remaining === 0) {
          return { valid: false, gatePass, reason: 'Pass has reached maximum entries' };
        }
        return { valid: false, gatePass, reason: 'Pass is not valid' };
      }

      // Record usage
      await this.gatePassesRepository.recordUsage(gatePass.id, entryPoint);

      return { valid: true, gatePass };
    } catch (error) {
      return { valid: false, reason: 'Error validating access' };
    }
  }

  async findByQRCode(qrCodeData: string): Promise<GatePassEntity | null> {
    return await this.gatePassesRepository.findByQRCode(qrCodeData);
  }

  async findByBarcode(barcode: string): Promise<GatePassEntity | null> {
    return await this.gatePassesRepository.findByBarcode(barcode);
  }

  async findByVehicle(vehicleId: string, options: SearchGatePassesDto = {}): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
  }> {
    return await this.gatePassesRepository.findByVehicle(vehicleId, options);
  }

  async findByTenant(tenantId: string, options: SearchGatePassesDto = {}): Promise<{
    gatePasses: GatePassEntity[];
    total: number;
  }> {
    return await this.gatePassesRepository.findByTenant(tenantId, options);
  }

  async getExpiringPasses(days: number = 7): Promise<GatePassEntity[]> {
    return await this.gatePassesRepository.getExpiringPasses(days);
  }

  async getActivePassesCount(tenantId?: string): Promise<number> {
    return await this.gatePassesRepository.getActivePassesCount(tenantId);
  }

  async getStatistics(tenantId?: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    revoked: number;
    by_pass_type: Record<string, number>;
    total_entries_today: number;
    expiring_soon: number;
  }> {
    return await this.gatePassesRepository.getStatistics(tenantId);
  }

  async createTemporaryPass(
    vehicleId: string,
    visitorName: string,
    purpose: string,
    hours: number = 24,
    createdBy: string,
  ): Promise<GatePassEntity> {
    const now = new Date();
    const endDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const createDto: CreateGatePassDto = {
      vehicle_id: vehicleId,
      pass_type: 'temporary' as any,
      start_date: now,
      end_date: endDate,
      created_by: createdBy,
      visitor_name,
      purpose,
      max_entries: 1,
      unlimited_access: false,
      is_scannable: true,
      send_notifications: true,
    };

    return await this.create(createDto);
  }

  async createVisitorPass(
    vehicleId: string,
    visitorName: string,
    visitorPhone: string,
    purpose: string,
    expectedArrival: Date,
    expectedDeparture: Date,
    createdBy: string,
  ): Promise<GatePassEntity> {
    const createDto: CreateGatePassDto = {
      vehicle_id: vehicleId,
      pass_type: 'visitor' as any,
      start_date: expectedArrival,
      end_date: expectedDeparture,
      created_by: createdBy,
      visitor_name,
      visitor_phone,
      purpose,
      expected_arrival: expectedArrival,
      expected_departure: expectedDeparture,
      max_entries: 1,
      unlimited_access: false,
      is_scannable: true,
      send_notifications: true,
    };

    return await this.create(createDto);
  }

  async extendPass(id: string, newEndDate: Date): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);

    if (new Date(newEndDate) <= new Date(gatePass.end_date)) {
      throw new Error('New end date must be after current end date');
    }

    return await this.update(id, { end_date: newEndDate });
  }

  async updateUsageCount(id: string, increment: number = 1): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);
    return await this.update(id, {
      current_entries: gatePass.current_entries + increment,
    });
  }

  async approvePass(id: string, approvedBy: string): Promise<GatePassEntity> {
    const gatePass = await this.findOne(id);
    return await this.update(id, {
      status: 'active' as any,
      approved_by,
      approved_at: new Date(),
    });
  }

  async regenerateQRCode(id: string): Promise<GatePassEntity> {
    // This would require updating the repository to regenerate QR code
    const gatePass = await this.findOne(id);

    // For now, return the existing gatePass
    // In a real implementation, you'd regenerate the QR code
    return gatePass;
  }

  private async sendPassCreatedNotification(gatePass: GatePassEntity): Promise<void> {
    const subject = `Gate Pass Created - ${gatePass.display_name}`;
    const message = `
      A new gate pass has been created:

      Type: ${gatePass.pass_type}
      Vehicle: ${gatePass.vehicle?.display_name}
      Valid From: ${gatePass.start_date.toLocaleDateString()}
      Valid Until: ${gatePass.end_date.toLocaleDateString()}
      Status: ${gatePass.status}
    `;

    for (const email of gatePass.notification_emails || []) {
      await this.notificationService.sendEmail(email, subject, message);
    }
  }

  private async sendPassRevokedNotification(gatePass: GatePassEntity, reason?: string): Promise<void> {
    const subject = `Gate Pass Revoked - ${gatePass.display_name}`;
    const message = `
      A gate pass has been revoked:

      Type: ${gatePass.pass_type}
      Vehicle: ${gatePass.vehicle?.display_name}
      Reason: ${reason || 'Not specified'}
      Revoked At: ${new Date().toLocaleDateString()}
    `;

    for (const email of gatePass.notification_emails || []) {
      await this.notificationService.sendEmail(email, subject, message);
    }
  }

  async sendExpirationReminders(): Promise<void> {
    const expiringPasses = await this.getExpiringPasses(3); // 3 days

    for (const pass of expiringPasses) {
      if (pass.send_notifications && pass.notification_emails?.length > 0) {
        const subject = `Gate Pass Expiring Soon - ${pass.display_name}`;
        const message = `
          Your gate pass is expiring soon:

          Type: ${pass.pass_type}
          Vehicle: ${pass.vehicle?.display_name}
          Expires On: ${pass.end_date.toLocaleDateString()}
          Days Remaining: ${pass.days_until_expiry}

          Please renew your pass if needed.
        `;

        for (const email of pass.notification_emails || []) {
          await this.notificationService.sendEmail(email, subject, message);
        }
      }
    }
  }
}