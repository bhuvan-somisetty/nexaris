import { NotImplementedException } from '@nestjs/common';
import {
  IPaymentProvider,
  CreatePaymentResult,
  VerifyPaymentResult,
  RefundResult,
} from './payment-provider.interface';

/**
 * RazorpayProvider — stub for future Razorpay integration.
 *
 * To activate:
 * 1. Install: npm install razorpay
 * 2. Add env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 * 3. Implement createOrder, verifyPayment, initiateRefund using the Razorpay SDK.
 * 4. Switch provider to RAZORPAY in PaymentProviderFactory / PaymentsService.
 *
 * No other business logic changes are required — the IPaymentProvider contract
 * guarantees full compatibility with the rest of the payment system.
 */
export class RazorpayProvider implements IPaymentProvider {
  async createOrder(
    amount: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<CreatePaymentResult> {
    throw new NotImplementedException(
      'Razorpay integration is pending. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then implement this method.',
    );
  }

  async verifyPayment(
    providerOrderId: string,
    providerPaymentId: string,
    providerSignature?: string,
  ): Promise<VerifyPaymentResult> {
    throw new NotImplementedException(
      'Razorpay integration is pending. Implement HMAC-SHA256 signature verification using razorpay.webhooks.verifyPaymentSignature().',
    );
  }

  async initiateRefund(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    throw new NotImplementedException(
      'Razorpay integration is pending. Implement refund creation using razorpay.payments.refund().',
    );
  }
}
