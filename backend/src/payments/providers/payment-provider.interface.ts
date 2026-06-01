export interface CreatePaymentResult {
  providerOrderId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  providerPaymentId: string;
  providerSignature?: string;
  failureReason?: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
  failureReason?: string;
}

export interface IPaymentProvider {
  /**
   * Create a payment order on the provider side.
   * For MOCK: returns synthetic IDs. For Razorpay: calls orders API.
   */
  createOrder(
    amount: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<CreatePaymentResult>;

  /**
   * Verify that a payment was captured successfully.
   * For MOCK: validates fake IDs. For Razorpay: verifies HMAC signature.
   */
  verifyPayment(
    providerOrderId: string,
    providerPaymentId: string,
    providerSignature?: string,
  ): Promise<VerifyPaymentResult>;

  /**
   * Initiate a refund for a captured payment.
   * For MOCK: returns synthetic refund ID. For Razorpay: calls refunds API.
   */
  initiateRefund(
    providerPaymentId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult>;
}
