import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from '@prisma/client';

/**
 * WebhooksController — receives asynchronous payment events from providers.
 *
 * The mock webhook endpoint enables full local testing of async payment flows
 * without a real payment gateway. The razorpay endpoint is stubbed and ready
 * for future implementation with signature verification.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * POST /api/webhooks/mock
   * Mock webhook for local development and testing.
   * Simulates: payment.captured | payment.failed
   *
   * Body: { paymentId, event: 'payment.captured' | 'payment.failed', userId }
   */
  @Post('mock')
  @HttpCode(200)
  async mockWebhook(
    @Body('paymentId') paymentId: string,
    @Body('event') event: string,
    @Body('userId') userId: string,
    @Body('paymentMethod') paymentMethod?: PaymentMethod,
  ) {
    if (!paymentId || !event || !userId) {
      return {
        received: false,
        error: 'Missing required fields: paymentId, event, userId',
      };
    }

    if (event === 'payment.captured') {
      const result = await this.paymentsService.verifyPayment(
        paymentId,
        userId,
        {
          providerPaymentId: `mock_webhook_pay_${Date.now()}`,
          paymentMethod: paymentMethod || PaymentMethod.MOCK,
          simulateFailure: false,
        },
      );
      return { received: true, event, result };
    }

    if (event === 'payment.failed') {
      const result = await this.paymentsService.verifyPayment(
        paymentId,
        userId,
        {
          providerPaymentId: 'mock_fail',
          simulateFailure: true,
        },
      );
      return { received: true, event, result };
    }

    return { received: false, error: `Unknown event: ${event}` };
  }

  /**
   * POST /api/webhooks/razorpay
   * Future Razorpay webhook receiver.
   *
   * TODO (Phase 6+):
   * 1. Verify X-Razorpay-Signature header using HMAC-SHA256
   * 2. Parse event type: payment.captured, payment.failed, refund.created
   * 3. Call paymentsService.verifyPayment or initiateRefund accordingly
   * 4. Return 200 to acknowledge receipt (Razorpay retries on non-200)
   */
  @Post('razorpay')
  @HttpCode(200)
  async razorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    // Signature verification will go here using process.env.RAZORPAY_WEBHOOK_SECRET
    // const isValid = verifyRazorpaySignature(body, signature);
    // if (!isValid) throw new UnauthorizedException('Invalid Razorpay signature');

    return {
      received: true,
      note: 'Razorpay webhook integration pending Phase 6+.',
    };
  }
}
