import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConstructionPermitsRepository } from './construction-permits.repository';
import {
  ConstructionPermitEntity,
  PermitType,
  PermitStatus,
  PermitPriority,
  InspectionType,
} from './entities/construction-permit.entity';
import { CreatePermitDto, UpdatePermitDto, SearchPermitsDto } from '@hoa-platform/shared';
import { AuditService } from '@hoa-platform/shared';
import { Audit } from '@hoa-platform/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ConstructionPermitsService {
  constructor(
    private readonly permitsRepository: ConstructionPermitsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(createPermitDto: CreatePermitDto): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.create(createPermitDto);

    // Log permit creation
    await this.auditService.log({
      action: 'create',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: createPermitDto.created_by || createPermitDto.property_owner_id,
      details: {
        permit_type: permit.permit_type,
        project_title: permit.project_title,
        household_id: permit.household_id,
      },
    });

    // Send notification to household about new permit application
    await this.sendPermitNotification(permit, 'permit_created');

    return permit;
  }

  async findAll(options: SearchPermitsDto = {}, tenantId?: string): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.permitsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<ConstructionPermitEntity> {
    return await this.permitsRepository.findOne(id);
  }

  async findByPermitNumber(permitNumber: string): Promise<ConstructionPermitEntity | null> {
    return await this.permitsRepository.findByPermitNumber(permitNumber);
  }

  async update(id: string, updatePermitDto: UpdatePermitDto): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.update(id, updatePermitDto);

    await this.auditService.log({
      action: 'update',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: updatePermitDto.updated_by,
      details: updatePermitDto,
    });

    return permit;
  }

  @Audit('delete', 'construction_permit')
  async remove(id: string): Promise<void> {
    await this.permitsRepository.remove(id);
  }

  // Permit workflow methods
  async submitForReview(id: string, submittedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.is_draft) {
      throw new Error('Permit must be in draft status to submit for review');
    }

    permit.submitForReview();

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      approval_workflow: permit.approval_workflow,
    });

    await this.auditService.log({
      action: 'submit_for_review',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: submittedBy,
    });

    // Send notification to admin team about new submission
    await this.sendPermitNotification(updatedPermit, 'permit_submitted');

    return updatedPermit;
  }

  async approvePermit(id: string, approvedBy: string, conditions?: string[]): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.approve(approvedBy);

    if (conditions) {
      permit.approval_workflow.conditions = conditions;
    }

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      approval_workflow: permit.approval_workflow,
    });

    await this.auditService.log({
      action: 'approve',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: approvedBy,
      details: { conditions },
    });

    // Send approval notification
    await this.sendPermitNotification(updatedPermit, 'permit_approved');

    return updatedPermit;
  }

  async rejectPermit(id: string, reason: string, rejectedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.reject(reason, rejectedBy);

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      rejection_reason: permit.rejection_reason,
      approval_workflow: permit.approval_workflow,
    });

    await this.auditService.log({
      action: 'reject',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: rejectedBy,
      details: { reason },
    });

    // Send rejection notification
    await this.sendPermitNotification(updatedPermit, 'permit_rejected');

    return updatedPermit;
  }

  async issuePermit(id: string, issuedBy: string, permitConditions?: any): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.issuePermit(issuedBy);

    if (permitConditions) {
      permit.permit_conditions = permitConditions;
    }

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      issued_date: permit.issued_date,
      expires_date: permit.expires_date,
      approval_workflow: permit.approval_workflow,
      permit_conditions: permit.permit_conditions,
    });

    await this.auditService.log({
      action: 'issue',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: issuedBy,
    });

    // Send permit issued notification
    await this.sendPermitNotification(updatedPermit, 'permit_issued');

    return updatedPermit;
  }

  async startWork(id: string, startedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.startWork();

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      actual_start_date: permit.actual_start_date,
    });

    await this.auditService.log({
      action: 'start_work',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: startedBy,
    });

    // Send work started notification
    await this.sendPermitNotification(updatedPermit, 'permit_work_started');

    return updatedPermit;
  }

  async completePermit(id: string, completedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    permit.completeProject();

    const updatedPermit = await this.permitsRepository.update(id, {
      status: permit.status,
      actual_completion_date: permit.actual_completion_date,
      final_inspection_date: permit.final_inspection_date,
    });

    await this.auditService.log({
      action: 'complete',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: completedBy,
    });

    // Send project completed notification
    await this.sendPermitNotification(updatedPermit, 'permit_completed');

    return updatedPermit;
  }

  // Inspection methods
  async scheduleInspection(
    id: string,
    inspectionData: {
      type: InspectionType;
      scheduled_date: Date;
      inspector_id: string;
      comments?: string;
    },
    scheduledBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.scheduleInspection(id, inspectionData);

    await this.auditService.log({
      action: 'schedule_inspection',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: scheduledBy,
      details: inspectionData,
    });

    // Send inspection scheduled notification
    await this.sendPermitNotification(permit, 'permit_inspection_scheduled');

    return permit;
  }

  async completeInspection(
    id: string,
    inspectionId: string,
    result: {
      status: 'passed' | 'failed';
      comments: string;
      photos?: string[];
      next_inspection?: string;
    },
    inspectedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.completeInspection(id, inspectionId, result);

    await this.auditService.log({
      action: 'complete_inspection',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: inspectedBy,
      details: result,
    });

    // Send inspection completed notification
    await this.sendPermitNotification(permit, result.status === 'passed' ? 'permit_inspection_passed' : 'permit_inspection_failed');

    return permit;
  }

  // Violation management
  async addViolation(
    id: string,
    violationData: {
      type: string;
      description: string;
      severity: 'minor' | 'major' | 'critical';
      fine?: number;
    },
    reportedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.addViolation(id, violationData);

    await this.auditService.log({
      action: 'add_violation',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: reportedBy,
      details: violationData,
    });

    // Send violation notification
    await this.sendPermitNotification(permit, 'permit_violation_added');

    return permit;
  }

  async resolveViolation(id: string, violationId: string, resolvedBy: string): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.resolveViolation(id, violationId);

    await this.auditService.log({
      action: 'resolve_violation',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: resolvedBy,
      details: { violation_id: violationId },
    });

    return permit;
  }

  // Progress tracking
  async addProgressUpdate(
    id: string,
    updateData: {
      completion_percentage: number;
      description: string;
      photos?: string[];
      issues?: string[];
    },
    updatedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.addProgressUpdate(id, updateData, updatedBy);

    await this.auditService.log({
      action: 'add_progress_update',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: updatedBy,
      details: updateData,
    });

    return permit;
  }

  // Permit extension
  async extendPermit(
    id: string,
    newExpiryDate: Date,
    reason: string,
    extendedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.permitsRepository.extendPermit(id, newExpiryDate, reason, extendedBy);

    await this.auditService.log({
      action: 'extend_permit',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: extendedBy,
      details: { new_expiry_date: newExpiryDate, reason },
    });

    // Send extension notification
    await this.sendPermitNotification(permit, 'permit_extended');

    return permit;
  }

  // Change orders
  async addChangeOrder(
    id: string,
    changeOrderData: {
      description: string;
      cost_change: number;
      duration_change: number;
    },
    requestedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.change_orders) {
      permit.change_orders = [];
    }

    permit.change_orders.push({
      id: '', // Will be generated
      description: changeOrderData.description,
      cost_change: changeOrderData.cost_change,
      duration_change: changeOrderData.duration_change,
      requested_date: new Date(),
      status: 'pending',
    });

    const updatedPermit = await this.permitsRepository.update(id, {
      change_orders: permit.change_orders,
    });

    await this.auditService.log({
      action: 'add_change_order',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: requestedBy,
      details: changeOrderData,
    });

    // Send change order notification
    await this.sendPermitNotification(updatedPermit, 'permit_change_order_requested');

    return updatedPermit;
  }

  async approveChangeOrder(
    id: string,
    changeOrderId: string,
    approvedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.change_orders) {
      throw new Error('No change orders found for this permit');
    }

    const changeOrder = permit.change_orders.find(co => co.id === changeOrderId);
    if (!changeOrder) {
      throw new Error('Change order not found');
    }

    changeOrder.status = 'approved';
    changeOrder.approved_date = new Date();
    changeOrder.approved_by = approvedBy;

    const updatedPermit = await this.permitsRepository.update(id, {
      change_orders: permit.change_orders,
    });

    await this.auditService.log({
      action: 'approve_change_order',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: approvedBy,
      details: { change_order_id: changeOrderId },
    });

    return updatedPermit;
  }

  // Document management
  async uploadDocuments(
    id: string,
    documents: {
      type: string;
      file_url: string;
      file_name: string;
      file_size: number;
      description?: string;
    }[],
    uploadedBy: string,
  ): Promise<ConstructionPermitEntity> {
    const permit = await this.findOne(id);

    if (!permit.project_documents) {
      permit.project_documents = {
        site_plan: '',
        floor_plans: [],
        elevation_drawings: [],
        engineering_specs: [],
        material_specifications: [],
        photos: [],
        contracts: [],
        insurance_documents: [],
        permits: [],
        other_documents: [],
      };
    }

    documents.forEach(doc => {
      switch (doc.type) {
        case 'site_plan':
          permit.project_documents.site_plan = doc.file_url;
          break;
        case 'floor_plan':
          permit.project_documents.floor_plans.push(doc.file_url);
          break;
        case 'elevation_drawing':
          permit.project_documents.elevation_drawings.push(doc.file_url);
          break;
        case 'engineering_spec':
          permit.project_documents.engineering_specs.push(doc.file_url);
          break;
        case 'material_specification':
          permit.project_documents.material_specifications.push(doc.file_url);
          break;
        case 'photo':
          permit.project_documents.photos.push(doc.file_url);
          break;
        case 'contract':
          permit.project_documents.contracts.push(doc.file_url);
          break;
        case 'insurance_document':
          permit.project_documents.insurance_documents.push(doc.file_url);
          break;
        case 'permit':
          permit.project_documents.permits.push(doc.file_url);
          break;
        default:
          permit.project_documents.other_documents.push(doc.file_url);
      }
    });

    const updatedPermit = await this.permitsRepository.update(id, {
      project_documents: permit.project_documents,
    });

    await this.auditService.log({
      action: 'upload_documents',
      entity_type: 'construction_permit',
      entity_id: permit.id,
      tenant_id: permit.household?.tenant_id,
      user_id: uploadedBy,
      details: { document_count: documents.length },
    });

    return updatedPermit;
  }

  // Query methods for different user roles
  async findByHousehold(householdId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    return await this.permitsRepository.findByHousehold(householdId, options);
  }

  async findByContractor(contractorId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    return await this.permitsRepository.findByContractor(contractorId, options);
  }

  async findByTenant(tenantId: string, options: SearchPermitsDto = {}): Promise<{
    permits: ConstructionPermitEntity[];
    total: number;
  }> {
    return await this.permitsRepository.findByTenant(tenantId, options);
  }

  async getPendingApprovals(tenantId: string): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository.getPendingApprovals(tenantId);
  }

  async getActivePermits(tenantId: string): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository.getActivePermits(tenantId);
  }

  async getOverduePermits(tenantId: string): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository.getOverduePermits(tenantId);
  }

  async getExpiringPermits(tenantId: string, daysThreshold: number = 30): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository.getExpiringPermits(tenantId, daysThreshold);
  }

  async getPermitsRequiringInspection(tenantId: string): Promise<ConstructionPermitEntity[]> {
    return await this.permitsRepository.getPermitsRequiringInspection(tenantId);
  }

  async getStatistics(tenantId?: string): Promise<any> {
    return await this.permitsRepository.getStatistics(tenantId);
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringPermits(): Promise<void> {
    try {
      // This would check for permits expiring in the next 7 days and send notifications
      const expiringThreshold = 7;
      const tenants = await this.getAllActiveTenants(); // This method would need to be implemented

      for (const tenant of tenants) {
        const expiringPermits = await this.getExpiringPermits(tenant.id, expiringThreshold);

        for (const permit of expiringPermits) {
          await this.sendPermitNotification(permit, 'permit_expiring_soon');
        }
      }
    } catch (error) {
      console.error('Error checking expiring permits:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverduePermits(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants(); // This method would need to be implemented

      for (const tenant of tenants) {
        const overduePermits = await this.getOverduePermits(tenant.id);

        for (const permit of overduePermits) {
          await this.sendPermitNotification(permit, 'permit_overdue');
        }
      }
    } catch (error) {
      console.error('Error checking overdue permits:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkInspectionsDue(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants(); // This method would need to be implemented

      for (const tenant of tenants) {
        const permitsNeedingInspection = await this.getPermitsRequiringInspection(tenant.id);

        for (const permit of permitsNeedingInspection) {
          await this.sendPermitNotification(permit, 'permit_inspection_due');
        }
      }
    } catch (error) {
      console.error('Error checking inspections due:', error);
    }
  }

  // Helper methods
  private async sendPermitNotification(permit: ConstructionPermitEntity, action: string): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: action as any,
        title: this.getNotificationTitle(action),
        message: this.getNotificationMessage(permit, action),
        recipient_id: permit.property_owner_id,
        household_id: permit.household_id,
        data: {
          permit_id: permit.id,
          permit_number: permit.permit_number,
          project_title: permit.project_title,
          status: permit.status,
        },
      });
    } catch (error) {
      console.error(`Failed to send ${action} notification for permit ${permit.id}:`, error);
    }
  }

  private getNotificationTitle(action: string): string {
    const titles = {
      permit_created: 'Permit Application Created',
      permit_submitted: 'Permit Application Submitted',
      permit_approved: 'Permit Application Approved',
      permit_rejected: 'Permit Application Rejected',
      permit_issued: 'Construction Permit Issued',
      permit_work_started: 'Construction Work Started',
      permit_completed: 'Construction Project Completed',
      permit_inspection_scheduled: 'Inspection Scheduled',
      permit_inspection_passed: 'Inspection Passed',
      permit_inspection_failed: 'Inspection Failed',
      permit_violation_added: 'Permit Violation Recorded',
      permit_extended: 'Permit Extended',
      permit_change_order_requested: 'Change Order Requested',
      permit_expiring_soon: 'Permit Expiring Soon',
      permit_overdue: 'Permit Project Overdue',
      permit_inspection_due: 'Inspection Due',
    };

    return titles[action] || 'Permit Update';
  }

  private getNotificationMessage(permit: ConstructionPermitEntity, action: string): string {
    const messages = {
      permit_created: `Your construction permit application for "${permit.project_title}" has been created.`,
      permit_submitted: `Your construction permit application "${permit.permit_number}" has been submitted for review.`,
      permit_approved: `Your construction permit application "${permit.permit_number}" has been approved!`,
      permit_rejected: `Your construction permit application "${permit.permit_number}" has been rejected. Please check for details.`,
      permit_issued: `Construction permit "${permit.permit_number}" has been issued. Work may now begin.`,
      permit_work_started: `Construction work has begun for permit "${permit.permit_number}".`,
      permit_completed: `Construction project for permit "${permit.permit_number}" has been completed successfully.`,
      permit_inspection_scheduled: `An inspection has been scheduled for your project "${permit.permit_number}".`,
      permit_inspection_passed: `Inspection passed for permit "${permit.permit_number}".`,
      permit_inspection_failed: `Inspection failed for permit "${permit.permit_number}". Please address the issues.`,
      permit_violation_added: `A violation has been recorded for permit "${permit.permit_number}".`,
      permit_extended: `Permit "${permit.permit_number}" has been extended.`,
      permit_change_order_requested: `A change order has been requested for permit "${permit.permit_number}".`,
      permit_expiring_soon: `Permit "${permit.permit_number}" will expire soon. Please take necessary action.`,
      permit_overdue: `Project for permit "${permit.permit_number}" is overdue.`,
      permit_inspection_due: `An inspection is due for permit "${permit.permit_number}".`,
    };

    return messages[action] || `Update for construction permit "${permit.permit_number}".`;
  }

  // This method would need to be implemented to get all active tenants
  private async getAllActiveTenants(): Promise<Array<{ id: string }>> {
    // Implementation would query the tenants repository
    // For now, return empty array
    return [];
  }
}