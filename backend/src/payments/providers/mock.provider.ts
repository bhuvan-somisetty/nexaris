import { v4 as uuidv4 } from 'uuid';
import {
  IPaymentProvider,
  CreatePaymentResult,
  VerifyPaymentResult,
  RefundResult,
} from './payment-provider.interface';

/**
 * MockPaymentProvider — simulates a real payment gateway for development and testing.
 * No network calls are made. All IDs are synthetic UUIDs.
 *
 * Failure simulation: pass simulateFailure=true to the verify step to test failure flows.
 */
export class MockPaymentProvider implements IPaymentProvider {
  async createOrder(
    amount: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<CreatePaymentResult> {
    // Simulate provider latency (omitted in prod; kept as comment for future throttle testing)
    return {
      providerOrderId: `mock_order_${idempotencyKey}`,
      amount,
      currency,
    };
  }

  async verifyPayment(
    providerOrderId: string,
    providerPaymentId: string,
    providerSignature?: string,
  ): Promise<VerifyPaymentResult> {
    // Detect test failure flag embedded in the providerPaymentId
    const simulateFailure = providerPaymentId === 'mock_fail';

    if (simulateFailure) {
      return {
        success: false,
        providerPaymentId,
        failureReason:
          'Payment declined by mock provider (test failure simulation).',
      };
    }

    return {
      success: true,
      providerPaymentId: providerPaymentId || `mock_pay_${uuidv4()}`,
      providerSignature: `mock_sig_${uuidv4()}`,
    };
  }

  async initiateRefund(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    return {
      success: true,
      providerRefundId: `mock_refund_${uuidv4()}`,
    };
  }
}
