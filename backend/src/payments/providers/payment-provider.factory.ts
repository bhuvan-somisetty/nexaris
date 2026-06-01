import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { IPaymentProvider } from './payment-provider.interface';
import { MockPaymentProvider } from './mock.provider';
import { RazorpayProvider } from './razorpay.provider';

/**
 * PaymentProviderFactory — the single switch point for changing payment providers.
 *
 * To switch from MOCK to Razorpay for production:
 *   Change the active provider in PaymentsService from PaymentProvider.MOCK to PaymentProvider.RAZORPAY.
 *   No other business logic changes are required.
 */
@Injectable()
export class PaymentProviderFactory {
  getProvider(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case PaymentProvider.MOCK:
        return new MockPaymentProvider();
      case PaymentProvider.RAZORPAY:
        return new RazorpayProvider();
      default:
        return new MockPaymentProvider();
    }
  }
}
