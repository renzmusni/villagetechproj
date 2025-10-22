import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Not, Between } from 'typeorm';
import {
  PaymentEntity,
  PaymentType,
  PaymentStatus,
  PaymentMethod,
  PaymentGateway,
  InvoiceStatus,
  RecurringPaymentStatus,
} from './entities/payment.entity';
import { CreatePaymentDto, UpdatePaymentDto, SearchPaymentsDto } from '@hoa-platform/shared';
import { NotFoundError, ValidationError } from '@hoa-platform/shared';
import { HouseholdsRepository } from '../households/households.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    private readonly householdsRepository: HouseholdsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(createPaymentDto: Partial<PaymentEntity>): Promise<PaymentEntity> {
    // Validate household exists
    if (createPaymentDto.household_id) {
      const household = await this.householdsRepository.findOne(createPaymentDto.household_id);
      if (!household) {
        throw new NotFoundError('Household', createPaymentDto.household_id);
      }
    }

    // Validate user exists if specified
    if (createPaymentDto.user_id) {
      const user = await this.usersRepository.findOne(createPaymentDto.user_id);
      if (!user) {
        throw new NotFoundError('User', createPaymentDto.user_id);
      }
    }

    // Validate amounts
    if (createPaymentDto.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    if (createPaymentDto.total_amount < 0) {
      throw new ValidationError('Total amount cannot be negative');
    }

    // Validate dates
    if (createPaymentDto.due_date && createPaymentDto.paid_date) {
      if (new Date(createPaymentDto.due_date) > new Date(createPaymentDto.paid_date)) {
        throw new ValidationError('Paid date cannot be before due date');
      }
    }

    const payment = this.paymentsRepository.create(createPaymentDto);

    // Generate unique transaction ID
    payment.transaction_id = await this.generateTransactionId(payment.tenant_id);

    // Initialize audit log
    payment.addAuditEntry({
      action: 'payment_created',
      user_id: createPaymentDto.created_by || '',
      user_name: 'System', // Will be populated
      details: {
        amount: payment.amount,
        type: payment.type,
        payment_method: payment.payment_method,
      },
    });

    return await this.paymentsRepository.save(payment);
  }

  async findAll(options: SearchPaymentsDto = {}, tenantId?: string): Promise<{
    payments: PaymentEntity[];
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
      payment_method,
      gateway,
      household_id,
      user_id,
      min_amount,
      max_amount,
      due_date_from,
      due_date_to,
      paid_date_from,
      paid_date_to,
      is_overdue,
      is_recurring,
      has_refunds,
    } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.paid_by_user', 'paid_by_user')
      .where('1=1');

    // Add tenant filtering
    if (tenantId) {
      queryBuilder.andWhere('payment.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(payment.transaction_id ILIKE :search OR payment.invoice_number ILIKE :search OR payment.invoice_details->>\'description\' ILIKE :search OR payment.notes ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('payment.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (payment_method) {
      queryBuilder.andWhere('payment.payment_method = :paymentMethod', { paymentMethod });
    }

    if (gateway) {
      queryBuilder.andWhere('payment.gateway = :gateway', { gateway });
    }

    if (household_id) {
      queryBuilder.andWhere('payment.household_id = :householdId', { householdId });
    }

    if (user_id) {
      queryBuilder.andWhere('payment.user_id = :userId', { userId });
    }

    if (min_amount !== undefined) {
      queryBuilder.andWhere('payment.amount >= :minAmount', { minAmount });
    }

    if (max_amount !== undefined) {
      queryBuilder.andWhere('payment.amount <= :maxAmount', { maxAmount });
    }

    if (due_date_from) {
      queryBuilder.andWhere('payment.due_date >= :dueDateFrom', { dueDateFrom: new Date(due_date_from) });
    }

    if (due_date_to) {
      queryBuilder.andWhere('payment.due_date <= :dueDateTo', { dueDateTo: new Date(due_date_to) });
    }

    if (paid_date_from) {
      queryBuilder.andWhere('payment.paid_date >= :paidDateFrom', { paidDateFrom: new Date(paid_date_from) });
    }

    if (paid_date_to) {
      queryBuilder.andWhere('payment.paid_date <= :paidDateTo', { paidDateTo: new Date(paid_date_to) });
    }

    if (typeof is_overdue === 'boolean') {
      const now = new Date();
      if (is_overdue) {
        queryBuilder.andWhere(
          '(payment.paid_date IS NULL AND payment.due_date < :now AND payment.status != :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      } else {
        queryBuilder.andWhere(
          '(payment.paid_date IS NOT NULL OR payment.due_date >= :now OR payment.status = :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      }
    }

    if (typeof is_recurring === 'boolean') {
      if (is_recurring) {
        queryBuilder.andWhere('payment.is_recurring = :isRecurring', { isRecurring: true });
      } else {
        queryBuilder.andWhere('(payment.is_recurring = false OR payment.is_recurring IS NULL)');
      }
    }

    if (typeof has_refunds === 'boolean') {
      if (has_refunds) {
        queryBuilder.andWhere(
          'payment.status IN (:...refundStatuses)',
          {
            refundStatuses: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
          },
        );
      } else {
        queryBuilder.andWhere(
          'payment.status NOT IN (:...refundStatuses)',
          {
            refundStatuses: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
          },
        );
      }
    }

    const [payments, total] = await queryBuilder
      .orderBy('payment.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      payments,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['household', 'user', 'paid_by_user'],
    });

    if (!payment) {
      throw new NotFoundError('Payment', id);
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<PaymentEntity | null> {
    return await this.paymentsRepository.findOne({
      where: { transaction_id: transactionId },
      relations: ['household', 'user', 'paid_by_user'],
    });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<PaymentEntity | null> {
    return await this.paymentsRepository.findOne({
      where: { invoice_number: invoiceNumber },
      relations: ['household', 'user', 'paid_by_user'],
    });
  }

  async findByHousehold(householdId: string, options: SearchPaymentsDto = {}): Promise<{
    payments: PaymentEntity[];
    total: number;
  }> {
    const { status, type, is_overdue } = options;

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.household_id = :householdId', { householdId });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('payment.type = :type', { type });
    }

    if (typeof is_overdue === 'boolean') {
      const now = new Date();
      if (is_overdue) {
        queryBuilder.andWhere(
          '(payment.paid_date IS NULL AND payment.due_date < :now AND payment.status != :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      } else {
        queryBuilder.andWhere(
          '(payment.paid_date IS NOT NULL OR payment.due_date >= :now OR payment.status = :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      }
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [payments, total] = await queryBuilder
      .orderBy('payment.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { payments, total };
  }

  async findByUser(userId: string, options: SearchPaymentsDto = {}): Promise<{
    payments: PaymentEntity[];
    total: number;
  }> {
    const { status, type, is_overdue } = options;

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.user_id = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('payment.type = :type', { type });
    }

    if (typeof is_overdue === 'boolean') {
      const now = new Date();
      if (is_overdue) {
        queryBuilder.andWhere(
          '(payment.paid_date IS NULL AND payment.due_date < :now AND payment.status != :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      } else {
        queryBuilder.andWhere(
          '(payment.paid_date IS NOT NULL OR payment.due_date >= :now OR payment.status = :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      }
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [payments, total] = await queryBuilder
      .orderBy('payment.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { payments, total };
  }

  async findByTenant(tenantId: string, options: SearchPaymentsDto = {}): Promise<{
    payments: PaymentEntity[];
    total: number;
  }> {
    const { status, type, is_overdue, min_amount, max_amount } = options;

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('payment.type = :type', { type });
    }

    if (typeof is_overdue === 'boolean') {
      const now = new Date();
      if (is_overdue) {
        queryBuilder.andWhere(
          '(payment.paid_date IS NULL AND payment.due_date < :now AND payment.status != :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      } else {
        queryBuilder.andWhere(
          '(payment.paid_date IS NOT NULL OR payment.due_date >= :now OR payment.status = :cancelled)',
          { now, cancelled: PaymentStatus.CANCELLED },
        );
      }
    }

    if (min_amount !== undefined) {
      queryBuilder.andWhere('payment.amount >= :minAmount', { minAmount });
    }

    if (max_amount !== undefined) {
      queryBuilder.andWhere('payment.amount <= :maxAmount', { maxAmount });
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [payments, total] = await queryBuilder
      .orderBy('payment.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { payments, total };
  }

  async getOverduePayments(tenantId: string): Promise<PaymentEntity[]> {
    const now = new Date();

    return await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.paid_date IS NULL')
      .andWhere('payment.due_date < :now', { now })
      .andWhere('payment.status != :cancelled', { cancelled: PaymentStatus.CANCELLED })
      .orderBy('payment.due_date', 'ASC')
      .getMany();
  }

  async getPendingPayments(tenantId: string): Promise<PaymentEntity[]> {
    return await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :pending', { pending: PaymentStatus.PENDING })
      .orderBy('payment.due_date', 'ASC')
      .getMany();
  }

  async getFailedPayments(tenantId: string, hours: number = 24): Promise<PaymentEntity[]> {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));

    return await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :failed', { failed: PaymentStatus.FAILED })
      .andWhere('payment.created_at >= :since', { since })
      .orderBy('payment.created_at', 'DESC')
      .getMany();
  }

  async getPaymentsDueSoon(tenantId: string, days: number = 7): Promise<PaymentEntity[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + days);

    return await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.paid_date IS NULL')
      .andWhere('payment.due_date <= :thresholdDate', { thresholdDate })
      .andWhere('payment.due_date >= :now', { now: new Date() })
      .andWhere('payment.status != :cancelled', { cancelled: PaymentStatus.CANCELLED })
      .orderBy('payment.due_date', 'ASC')
      .getMany();
  }

  async getRetryablePayments(tenantId: string): Promise<PaymentEntity[]> {
    const now = new Date();

    return await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.household', 'household')
      .leftJoinAndSelect('payment.user', 'user')
      .where('payment.tenant_id = :tenantId', { tenantId })
      .andWhere('payment.status = :failed', { failed: PaymentStatus.FAILED })
      .andWhere('payment.retry_count < payment.max_retries')
      .andWhere('(payment.next_retry_date IS NULL OR payment.next_retry_date <= :now)', { now })
      .orderBy('payment.next_retry_date', 'ASC')
      .getMany();
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    // Validate amounts if being updated
    if (updatePaymentDto.amount !== undefined && updatePaymentDto.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    Object.assign(payment, updatePaymentDto);

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_updated',
      user_id: updatePaymentDto.updated_by || '',
      user_name: 'System',
      details: updatePaymentDto,
    });

    return await this.paymentsRepository.save(payment);
  }

  async updateStatus(id: string, status: PaymentStatus, updatedBy?: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.status = status;

    // Handle status-specific logic
    switch (status) {
      case PaymentStatus.COMPLETED:
        payment.markAsCompleted();
        break;

      case PaymentStatus.FAILED:
        if (!payment.failure_reason) {
          payment.failure_reason = 'Payment processing failed';
        }
        break;
    }

    // Add audit entry
    payment.addAuditEntry({
      action: 'status_changed',
      user_id: updatedBy || '',
      user_name: 'System',
      details: { old_status: payment.status, new_status: status },
    });

    return await this.paymentsRepository.save(payment);
  }

  async processPayment(id: string, processedBy: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.markAsCompleted();

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_processed',
      user_id: processedBy,
      user_name: 'System',
      details: {
        amount: payment.amount,
        gateway: payment.gateway,
      },
    });

    return await this.paymentsRepository.save(payment);
  }

  async failPayment(id: string, reason: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.markAsFailed(reason);

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_failed',
      user_id: 'system',
      user_name: 'System',
      details: { reason },
    });

    return await this.paymentsRepository.save(payment);
  }

  async cancelPayment(id: string, reason: string, cancelledBy: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.cancel(reason);

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_cancelled',
      user_id: cancelledBy,
      user_name: 'System',
      details: { reason },
    });

    return await this.paymentsRepository.save(payment);
  }

  async refundPayment(id: string, amount: number, reason: string, processedBy: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.refund(amount, reason, processedBy);

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_refunded',
      user_id: processedBy,
      user_name: 'System',
      details: { amount, reason },
    });

    return await this.paymentsRepository.save(payment);
  }

  async addRetry(id: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    payment.addRetry();

    // Add audit entry
    payment.addAuditEntry({
      action: 'payment_retry_added',
      user_id: 'system',
      user_name: 'System',
      details: {
        retry_count: payment.retry_count,
        next_retry_date: payment.next_retry_date,
      },
    });

    return await this.paymentsRepository.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentsRepository.remove(payment);
  }

  // Statistics and analytics
  async getStatistics(tenantId?: string, days: number = 30): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    overdue: number;
    refunded: number;
    total_amount: number;
    collected_amount: number;
    overdue_amount: number;
    refunded_amount: number;
    by_type: Record<PaymentType, number>;
    by_status: Record<PaymentStatus, number>;
    by_method: Record<PaymentMethod, number>;
    by_gateway: Record<PaymentGateway, number>;
    average_amount: number;
    success_rate: number;
    refund_rate: number;
    late_payment_rate: number;
  }> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.created_at >= :since', { since });

    if (tenantId) {
      queryBuilder.andWhere('payment.tenant_id = :tenantId', { tenantId });
    }

    const payments = await queryBuilder.getMany();

    const stats = {
      total: payments.length,
      completed: 0,
      failed: 0,
      pending: 0,
      overdue: 0,
      refunded: 0,
      total_amount: 0,
      collected_amount: 0,
      overdue_amount: 0,
      refunded_amount: 0,
      by_type: {} as Record<PaymentType, number>,
      by_status: {} as Record<PaymentStatus, number>,
      by_method: {} as Record<PaymentMethod, number>,
      by_gateway: {} as Record<PaymentGateway, number>,
      average_amount: 0,
      success_rate: 0,
      refund_rate: 0,
      late_payment_rate: 0,
    };

    payments.forEach(payment => {
      // Count by status
      switch (payment.status) {
        case PaymentStatus.COMPLETED:
          stats.completed++;
          stats.collected_amount += payment.amount;
          break;
        case PaymentStatus.FAILED:
          stats.failed++;
          break;
        case PaymentStatus.PENDING:
          stats.pending++;
          break;
        case PaymentStatus.REFUNDED:
          stats.refunded++;
          stats.refunded_amount += payment.refund_details?.refund_amount || 0;
          break;
      }

      // Count overdue payments
      if (payment.is_overdue) {
        stats.overdue++;
        stats.overdue_amount += payment.amount;
      }

      // Sum totals
      stats.total_amount += payment.amount;

      // Count by type
      stats.by_type[payment.type] = (stats.by_type[payment.type] || 0) + 1;

      // Count by status
      stats.by_status[payment.status] = (stats.by_status[payment.status] || 0) + 1;

      // Count by method
      stats.by_method[payment.payment_method] = (stats.by_method[payment.payment_method] || 0) + 1;

      // Count by gateway
      stats.by_gateway[payment.gateway] = (stats.by_gateway[payment.gateway] || 0) + 1;
    });

    // Calculate rates
    const totalProcessed = stats.completed + stats.failed;
    if (totalProcessed > 0) {
      stats.success_rate = (stats.completed / totalProcessed) * 100;
    }

    if (stats.completed > 0) {
      stats.refund_rate = (stats.refunded / stats.completed) * 100;
    }

    if (stats.total > 0) {
      stats.late_payment_rate = (stats.overdue / stats.total) * 100;
      stats.average_amount = stats.total_amount / stats.total;
    }

    return stats;
  }

  async getRevenueMetrics(tenantId?: string, days: number = 30): Promise<{
    total_revenue: number;
    hoa_dues_revenue: number;
    assessment_revenue: number;
    fee_revenue: number;
    other_revenue: number;
    revenue_by_month: Array<{
      month: string;
      revenue: number;
    }>;
    revenue_by_type: Record<PaymentType, number>;
    monthly_growth_rate: number;
    average_revenue_per_household: number;
  }> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const queryBuilder = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.created_at >= :since', { since })
      .andWhere('payment.status = :completed', { completed: PaymentStatus.COMPLETED });

    if (tenantId) {
      queryBuilder.andWhere('payment.tenant_id = :tenantId', { tenantId });
    }

    const payments = await queryBuilder.getMany();

    const metrics = {
      total_revenue: 0,
      hoa_dues_revenue: 0,
      assessment_revenue: 0,
      fee_revenue: 0,
      other_revenue: 0,
      revenue_by_month: [] as Array<{ month: string; revenue: number }>,
      revenue_by_type: {} as Record<PaymentType, number>,
      monthly_growth_rate: 0,
      average_revenue_per_household: 0,
    };

    const monthlyData = new Map<string, number>();

    payments.forEach(payment => {
      metrics.total_revenue += payment.amount;

      // Categorize by type
      switch (payment.type) {
        case PaymentType.HOA_DUES:
          metrics.hoa_dues_revenue += payment.amount;
          break;
        case PaymentType.SPECIAL_ASSESSMENT:
          metrics.assessment_revenue += payment.amount;
          break;
        case PaymentType.LATE_FEE:
        case PaymentType.INTEREST_CHARGE:
          metrics.fee_revenue += payment.amount;
          break;
        default:
          metrics.other_revenue += payment.amount;
          break;
      }

      // By type
      metrics.revenue_by_type[payment.type] = (metrics.revenue_by_type[payment.type] || 0) + payment.amount;

      // By month
      const month = payment.created_at.toISOString().slice(0, 7); // YYYY-MM
      monthlyData.set(month, (monthlyData.get(month) || 0) + payment.amount);
    });

    // Convert monthly data to array and calculate growth
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    metrics.revenue_by_month = sortedMonths.map(month => ({
      month,
      revenue: monthlyData.get(month)!,
    }));

    // Calculate monthly growth rate (simplified)
    if (metrics.revenue_by_month.length >= 2) {
      const currentMonth = metrics.revenue_by_month[metrics.revenue_by_month.length - 1].revenue;
      const previousMonth = metrics.revenue_by_month[metrics.revenue_by_month.length - 2].revenue;
      if (previousMonth > 0) {
        metrics.monthly_growth_rate = ((currentMonth - previousMonth) / previousMonth) * 100;
      }
    }

    return metrics;
  }

  private async generateTransactionId(tenantId: string): Promise<string> {
    const now = new Date();
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 10000);
    return `HOA_${tenantId}_${timestamp}_${random}`;
  }
}