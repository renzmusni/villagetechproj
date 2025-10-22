import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentsRepository } from './payments.repository';
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
import { AuditService } from '@hoa-platform/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { HouseholdsService } from '../households/households.service';

// Mock payment gateway interfaces (would be replaced with actual implementations)
interface StripeService {
  createPaymentIntent(options: {
    amount: number;
    currency: string;
    customer_email?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; clientSecret?: string; error?: string; paymentIntentId?: string }>;

  confirmPayment(paymentIntentId: string): Promise<{ success: boolean; paymentId?: string; error?: string }>;

  refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }>;

  createCustomer(options: {
    email: string;
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; customerId?: string; error?: string }>;
}

interface PayPalService {
  createOrder(options: {
    amount: number;
    currency: string;
    description?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; orderId?: string; approvalUrl?: string; error?: string }>;

  capturePayment(orderId: string): Promise<{ success: boolean; paymentId?: string; error?: string }>;

  refundPayment(paymentId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripeService: StripeService;
  private paypalService: PayPalService;

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly configService: ConfigService,
  ) {
    // Initialize payment gateway services (mocked for now)
    this.initializePaymentGateways();
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.create(createPaymentDto);

    // Log payment creation
    await this.auditService.log({
      action: 'create',
      entity_type: 'payment',
      entity_id: payment.id,
      tenant_id: payment.tenant_id,
      user_id: createPaymentDto.created_by,
      details: {
        amount: payment.amount,
        type: payment.type,
        payment_method: payment.payment_method,
        household_id: payment.household_id,
      },
    });

    // Send invoice if payment has invoice details
    if (payment.invoice_details) {
      await this.sendPaymentNotification(payment, 'payment_created');
    }

    return payment;
  }

  async findAll(options: SearchPaymentsDto = {}, tenantId?: string): Promise<{
    payments: PaymentEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    return await this.paymentsRepository.findAll(options, tenantId);
  }

  async findOne(id: string): Promise<PaymentEntity> {
    return await this.paymentsRepository.findOne(id);
  }

  async findByTransactionId(transactionId: string): Promise<PaymentEntity | null> {
    return await this.paymentsRepository.findByTransactionId(transactionId);
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.update(id, updatePaymentDto);

    await this.auditService.log({
      action: 'update',
      entity_type: 'payment',
      entity_id: payment.id,
      tenant_id: payment.tenant_id,
      user_id: updatePaymentDto.updated_by,
      details: updatePaymentDto,
    });

    return payment;
  }

  // Payment processing methods
  async processStripePayment(id: string, paymentMethodId: string, processedBy: string): Promise<{
    success: boolean;
    payment?: PaymentEntity;
    clientSecret?: string;
    error?: string;
  }> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Payment must be in pending status to process');
    }

    try {
      // Create Stripe Payment Intent
      const result = await this.stripeService.createPaymentIntent({
        amount: Math.round(payment.total_amount * 100), // Convert to cents
        currency: payment.currency,
        customer_email: payment.user?.email,
        metadata: {
          payment_id: payment.id,
          type: payment.type,
          household_id: payment.household_id,
        },
      });

      if (!result.success) {
        await this.failPayment(id, result.error || 'Stripe payment creation failed');
        return { success: false, error: result.error };
      }

      // Update payment with payment intent details
      const updatedPayment = await this.paymentsRepository.update(id, {
        status: PaymentStatus.PROCESSING,
        payment_details: {
          ...payment.payment_details,
          gateway_payment_intent_id: result.paymentIntentId,
        },
        updated_by: processedBy,
      });

      return {
        success: true,
        payment: updatedPayment,
        clientSecret: result.clientSecret,
      };

    } catch (error) {
      this.logger.error(`Stripe payment processing failed for payment ${id}:`, error);
      await this.failPayment(id, error.message);
      return { success: false, error: error.message };
    }
  }

  async confirmStripePayment(paymentIntentId: string, userId: string): Promise<{
    success: boolean;
    payment?: PaymentEntity;
    error?: string;
  }> {
    try {
      const result = await this.stripeService.confirmPayment(paymentIntentId);

      if (!result.success) {
        // Find payment by payment intent ID and mark as failed
        const payment = await this.findPaymentByGatewayIntentId(paymentIntentId);
        if (payment) {
          await this.failPayment(payment.id, result.error || 'Payment confirmation failed');
        }
        return { success: false, error: result.error };
      }

      // Find payment and mark as completed
      const payment = await this.findPaymentByGatewayIntentId(paymentIntentId);
      if (payment) {
        const updatedPayment = await this.processPayment(payment.id, userId);
        return { success: true, payment: updatedPayment };
      }

      return { success: false, error: 'Payment not found' };

    } catch (error) {
      this.logger.error(`Stripe payment confirmation failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async processPayPalPayment(id: string, returnUrl: string, cancelUrl: string, processedBy: string): Promise<{
    success: boolean;
    payment?: PaymentEntity;
    approvalUrl?: string;
    error?: string;
  }> {
    const payment = await this.findOne(id);

    if (payment.status !== PaymentStatus.PENDING) {
      throw new Error('Payment must be in pending status to process');
    }

    try {
      const result = await this.paypalService.createOrder({
        amount: payment.total_amount,
        currency: payment.currency,
        description: `${payment.type} - ${payment.invoice_details?.description || 'Payment'}`,
        returnUrl,
        cancelUrl,
      });

      if (!result.success) {
        await this.failPayment(id, result.error || 'PayPal order creation failed');
        return { success: false, error: result.error };
      }

      // Update payment with order details
      const updatedPayment = await this.paymentsRepository.update(id, {
        status: PaymentStatus.PROCESSING,
        payment_details: {
          ...payment.payment_details,
          paypal_transaction_id: result.orderId,
        },
        updated_by: processedBy,
      });

      return {
        success: true,
        payment: updatedPayment,
        approvalUrl: result.approvalUrl,
      };

    } catch (error) {
      this.logger.error(`PayPal payment processing failed for payment ${id}:`, error);
      await this.failPayment(id, error.message);
      return { success: false, error: error.message };
    }
  }

  async capturePayPalPayment(orderId: string, userId: string): Promise<{
    success: boolean;
    payment?: PaymentEntity;
    error?: string;
  }> {
    try {
      const result = await this.paypalService.capturePayment(orderId);

      if (!result.success) {
        // Find payment by order ID and mark as failed
        const payment = await this.findPaymentByPayPalOrderId(orderId);
        if (payment) {
          await this.failPayment(payment.id, result.error || 'PayPal capture failed');
        }
        return { success: false, error: result.error };
      }

      // Find payment and mark as completed
      const payment = await this.findPaymentByPayPalOrderId(orderId);
      if (payment) {
        const updatedPayment = await this.processPayment(payment.id, userId);
        return { success: true, payment: updatedPayment };
      }

      return { success: false, error: 'Payment not found' };

    } catch (error) {
      this.logger.error(`PayPal payment capture failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async processPayment(id: string, processedBy: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.processPayment(id, processedBy);

    // Send payment confirmation
    await this.sendPaymentNotification(payment, 'payment_completed');

    // Send receipt if enabled
    if (payment.send_receipt && payment.paid_by_user) {
      await this.sendPaymentReceipt(payment);
    }

    return payment;
  }

  async refundPayment(id: string, amount?: number, reason?: string, refundedBy?: string): Promise<{
    success: boolean;
    refund?: any;
    error?: string;
  }> {
    const payment = await this.findOne(id);

    if (!payment.is_completed) {
      throw new Error('Only completed payments can be refunded');
    }

    const refundAmount = amount || payment.total_amount;

    try {
      let result;

      // Use appropriate gateway based on payment method
      switch (payment.gateway) {
        case PaymentGateway.STRIPE:
          result = await this.stripeService.refundPayment(
            payment.payment_details?.stripe_charge_id || '',
            refundAmount ? Math.round(refundAmount * 100) : undefined,
          );
          break;
        case PaymentGateway.PAYPAL:
          result = await this.paypalService.refundPayment(
            payment.payment_details?.paypal_transaction_id || '',
            refundAmount,
          );
          break;
        default:
          // Manual refund processing
          result = { success: true, refundId: 'manual_refund' };
          break;
      }

      if (!result.success) {
        this.logger.error(`Refund failed for payment ${id}:`, result.error);
        return { success: false, error: result.error };
      }

      // Update payment with refund details
      const updatedPayment = await this.paymentsRepository.refund(
        id,
        refundAmount,
        reason || 'Refund requested',
        refundedBy || processedBy,
      );

      // Send refund notification
      await this.sendPaymentNotification(updatedPayment, 'payment_refunded');

      return { success: true, refund: result };

    } catch (error) {
      this.logger.error(`Refund processing failed for payment ${id}:`, error);
      return { success: false, error: error.message };
    }
  }

  async cancelPayment(id: string, reason: string, cancelledBy: string): Promise<PaymentEntity> {
    const payment = await this.paymentsRepository.cancelPayment(id, reason, cancelledBy);

    await this.auditService.log({
      action: 'cancel_payment',
      entity_type: 'payment',
      entity_id: payment.id,
      tenant_id: payment.tenant_id,
      user_id: cancelledBy,
      details: { reason },
    });

    await this.sendPaymentNotification(payment, 'payment_cancelled');

    return payment;
  }

  async markAsOverdue(id: string): Promise<PaymentEntity> {
    const payment = await this.findOne(id);

    if (!payment.is_overdue) {
      throw new Error('Payment is not overdue');
    }

    // Update notification settings
    await this.paymentsRepository.update(id, {
      notifications: {
        ...payment.notifications,
        late_fee_reminder_sent: false,
      },
    });

    // Send overdue notification
    await this.sendPaymentNotification(payment, 'payment_overdue');

    return payment;
  }

  // Template methods
  async createHOADues(paymentData: {
    household_id: string;
    user_id?: string;
    amount: number;
    due_date: Date;
    period: string;
    description?: string;
    recurring?: boolean;
    frequency?: PaymentFrequency;
  }): Promise<PaymentEntity> {
    const paymentData = PaymentEntity.createHOADues(paymentData);
    const payment = await this.create(paymentData);

    // Schedule recurring payment if applicable
    if (payment.is_recurring) {
      await this.scheduleNextPayment(payment.id);
    }

    return payment;
  }

  async createSpecialAssessment(paymentData: {
    household_id: string;
    amount: number;
    due_date: Date;
    project_name: string;
    project_description: string;
    assessment_type: string;
    assessment_period: {
      start_date: Date;
      end_date: Date;
    };
    payment_schedule?: string[];
  }): Promise<PaymentEntity> {
    const paymentData = PaymentEntity.createSpecialAssessment(paymentData);
    return await this.create(paymentData);
  }

  // Recurring payment management
  async scheduleNextPayment(paymentId: string): Promise<PaymentEntity> {
    const payment = await this.findOne(paymentId);

    if (!payment.is_recurring || !payment.recurring_payment) {
      throw new Error('Payment is not recurring');
    }

    // Calculate next payment date based on frequency
    const nextPaymentDate = this.calculateNextPaymentDate(
      payment.recurring_payment.frequency,
      payment.recurring_payment.interval_months,
    );

    if (!nextPaymentDate) {
      return payment;
    }

    // Create new payment for next period
    const nextPaymentData = {
      household_id: payment.household_id,
      user_id: payment.user_id,
      amount: payment.amount,
      due_date: nextPaymentDate,
      type: payment.type,
      is_recurring: true,
      frequency: payment.recurring_payment.frequency,
      invoice_details: {
        ...payment.invoice_details,
        description: `${payment.invoice_details?.description} - ${nextPaymentDate.toLocaleDateString()}`,
      },
    };

    const nextPayment = await this.create(nextPaymentData);

    // Update recurring payment reference
    await this.paymentsRepository.update(paymentId, {
      recurring_payment: {
        ...payment.recurring_payment,
        next_payment_date: nextPaymentDate,
      },
    });

    return nextPayment;
  }

  // Query methods
  async findByHousehold(householdId: string, options: SearchPaymentsDto = {}): Promise<{
    payments: PaymentEntity[];
    total: number;
  }> {
    return await this.paymentsRepository.findByHousehold(householdId, options);
  }

  async findByUser(userId: string, options: SearchPaymentsDto = {}): Promise<{
    payments: PaymentEntity[];
    total: number;
  }> {
    return await this.paymentsRepository.findByUser(userId, options);
  }

  async getOverduePayments(tenantId: string): Promise<PaymentEntity[]> {
    return await this.paymentsRepository.getOverduePayments(tenantId);
  }

  async getPendingPayments(tenantId: string): Promise<PaymentEntity[]> {
    return await this.paymentsRepository.getPendingPayments(tenantId);
  }

  async getFailedPayments(tenantId: string, hours: number = 24): Promise<PaymentEntity[]> {
    return await this.paymentsRepository.getFailedPayments(tenantId, hours);
  }

  async getPaymentsDueSoon(tenantId: string, days: number = 7): Promise<PaymentEntity[]> {
    return await this.paymentsRepository.getPaymentsDueSoon(tenantId, days);
  }

  async getStatistics(tenantId?: string, days: number = 30): Promise<any> {
    return await this.paymentsRepository.getStatistics(tenantId, days);
  }

  async getRevenueMetrics(tenantId?: string, days: number = 30): Promise<any> {
    return await this.paymentsRepository.getRevenueMetrics(tenantId, days);
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processOverduePayments(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants(); // This method would need to be implemented

      for (const tenant of tenants) {
        const overduePayments = await this.getOverduePayments(tenant.id);

        for (const payment of overduePayments) {
          await this.markAsOverdue(payment.id);

          // Process late fees if applicable
          if (payment.days_overdue > 30) {
            await this.processLateFee(payment.id);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error processing overdue payments:', error);
    }
  }

  @Cron(CronExpression.EVERY_15_MINUTES)
  async processFailedPayments(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants();

      for (const tenant of tenants) {
        const retryablePayments = await this.paymentsRepository.getRetryablePayments(tenant.id);

        for (const payment of retryablePayments) {
          await this.addRetry(payment.id);
        }
      }
    } catch (error) {
      this.logger.error('Error processing failed payments:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processRecurringPayments(): Promise<void> {
    try {
      const tenants = await this.getAllActiveTenants();

      for (const tenant of tenants) {
        // Find recurring payments that need to be scheduled
        // This would involve checking for recurring payments that are due
        // and creating new payment records
      }
    } catch (error) {
      this.logger.error('Error processing recurring payments:', error);
    }
  }

  // Private helper methods
  private async sendPaymentNotification(payment: PaymentEntity, action: string): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        type: action as any,
        title: this.getNotificationTitle(action, payment),
        message: this.getNotificationMessage(action, payment),
        recipient_id: payment.user_id,
        household_id: payment.household_id,
        data: {
          payment_id: payment.id,
          transaction_id: payment.transaction_id,
          amount: payment.amount,
          type: payment.type,
          status: payment.status,
          due_date: payment.due_date,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send ${action} notification for payment ${payment.id}:`, error);
    }
  }

  private async sendPaymentReceipt(payment: PaymentEntity): Promise<void> {
    try {
      await this.notificationsService.sendEmailNotification({
        to: payment.paid_by_user?.email || payment.user?.email,
        subject: `Payment Receipt - ${payment.transaction_id}`,
        template: 'payment_receipt',
        variables: {
          transaction_id: payment.transaction_id,
          invoice_number: payment.invoice_number,
          amount: payment.amount,
          currency: payment.currency,
          paid_date: payment.paid_date,
          type: payment.type,
          description: payment.invoice_details?.description,
          household_info: payment.household?.address,
        },
        recipient_id: payment.paid_by_user?.id,
      });
    } catch (error) {
      this.logger.error(`Failed to send payment receipt for payment ${payment.id}:`, error);
    }
  }

  private async processLateFee(paymentId: string): Promise<void> {
    // This would implement late fee calculation and payment creation
    // based on HOA rules and payment history
  }

  private async findPaymentByGatewayIntentId(paymentIntentId: string): Promise<PaymentEntity | null> {
    // Find payment by Stripe payment intent ID
    const result = await this.paymentsRepository.findAll(
      { limit: 1000 }, // Search all tenants
    );

    for (const tenantResult of result.payments) {
      const payment = tenantResult.find(p =>
        p.payment_details?.gateway_payment_intent_id === paymentIntentId
      );
      if (payment) return payment;
    }

    return null;
  }

  private async findPaymentByPayPalOrderId(orderId: string): Promise<PaymentEntity | null> {
    // Find payment by PayPal order ID
    const result = await this.paymentsRepository.findAll(
      { limit: 1000 }, // Search all tenants
    );

    for (const tenantResult of result.payments) {
      const payment = tenantResult.find(p =>
        p.payment_details?.paypal_transaction_id === orderId
      );
      if (payment) return payment;
    }

    return null;
  }

  private calculateNextPaymentDate(
    frequency: PaymentFrequency,
    intervalMonths?: number,
  ): Date | null {
    const now = new Date();
    let nextDate = new Date(now);

    switch (frequency) {
      case PaymentFrequency.MONTHLY:
        nextDate.setMonth(now.getMonth() + (intervalMonths || 1));
        break;
      case PaymentFrequency.QUARTERLY:
        nextDate.setMonth(now.getMonth() + (intervalMonths || 3));
        break;
      case PaymentFrequency.SEMI_ANNUALLY:
        nextDate.setMonth(now.getMonth() + (intervalMonths || 6));
        break;
      case PaymentFrequency.ANNUALLY:
        nextDate.setFullYear(now.getFullYear() + (intervalMonths || 12));
        break;
      case PaymentFrequency.CUSTOM:
        // Would need custom logic based on interval_months
        if (intervalMonths) {
          nextDate.setMonth(now.getMonth() + intervalMonths);
        } else {
          return null;
        }
        break;
      default:
        return null;
    }

    return nextDate;
  }

  private async addRetry(paymentId: string): Promise<void> {
    await this.paymentsRepository.addRetry(paymentId);
  }

  private getNotificationTitle(action: string, payment: PaymentEntity): string {
    const titles = {
      payment_created: 'Payment Created',
      payment_completed: 'Payment Completed',
      payment_failed: 'Payment Failed',
      payment_overdue: 'Payment Overdue',
      payment_refunded: 'Payment Refunded',
      payment_cancelled: 'Payment Cancelled',
    };

    return titles[action] || 'Payment Update';
  }

  private getNotificationMessage(action: string, payment: PaymentEntity): string {
    const messages = {
      payment_created: `A payment of $${payment.amount} has been created for ${payment.type}.`,
      payment_completed: `Your payment of $${payment.amount} has been processed successfully.`,
      payment_failed: `Your payment of $${payment.amount} could not be processed. Please update your payment method.`,
      payment_overdue: `Your payment of $${payment.amount} is ${payment.days_overdue} days overdue.`,
      payment_refunded: `A refund of $${payment.refund_details?.refund_amount || payment.amount} has been processed.`,
      payment_cancelled: `Your payment of $${payment.amount} has been cancelled.`,
    };

    return messages[action] || `Update regarding payment ${payment.transaction_id}.`;
  }

  private initializePaymentGateways(): void {
    // Mock implementations for demonstration
    // In a real implementation, these would be actual Stripe and PayPal SDKs
    this.stripeService = {
      createPaymentIntent: async (options) => {
        this.logger.log(`Mock: Creating Stripe payment intent for ${options.amount} ${options.currency}`);
        return { success: true, paymentIntentId: 'pi_mock_' + Math.random().toString(36).substr(2, 9) };
      },
      confirmPayment: async (paymentIntentId) => {
        this.logger.log(`Mock: Confirming Stripe payment ${paymentIntentId}`);
        return { success: true, paymentId: 'pay_mock_' + Math.random().toString(36).substr(2, 9) };
      },
      refundPayment: async (paymentId, amount) => {
        this.logger.log(`Mock: Refunding Stripe payment ${paymentId}, amount: ${amount}`);
        return { success: true, refundId: 're_mock_' + Math.random().toString(36).substr(2, 9) };
      },
      createCustomer: async (options) => {
        this.logger.log(`Mock: Creating Stripe customer for ${options.email}`);
        return { success: true, customerId: 'cus_mock_' + Math.random().toString(36).substr(2, 9) };
      },
    };

    this.paypalService = {
      createOrder: async (options) => {
        this.logger.log(`Mock: Creating PayPal order for ${options.amount} ${options.currency}`);
        return { success: true, orderId: 'order_mock_' + Math.random().toString(36).substr(2, 9) };
      },
      capturePayment: async (orderId) => {
        this.logger.log(`Mock: Capturing PayPal payment ${orderId}`);
        return { success: true, paymentId: 'paypal_mock_' + Math.random().toString(36).substr(2, 9) };
      },
      refundPayment: async (paymentId, amount) => {
        this.logger.log(`Mock: Refunding PayPal payment ${paymentId}, amount: ${amount}`);
        return { success: true, refundId: 'paypal_ref_mock_' + Math.random().toString(36).substr(2, 9) };
      },
    };
  }

  // This method would need to be implemented to get all active tenants
  private async getAllActiveTenants(): Promise<Array<{ id: string }>> {
    // Implementation would query the tenants repository
    // For now, return empty array
    return [];
  }
}