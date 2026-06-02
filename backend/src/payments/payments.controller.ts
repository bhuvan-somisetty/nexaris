import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, PaymentMethod } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Throttle({ checkout: { limit: 10, ttl: 60000 } })
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /** POST /api/payments/orders/:orderId/initiate — Customer initiates payment */
  @Post('orders/:orderId/initiate')
  @Roles(Role.CUSTOMER)
  async initiatePayment(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, req.user.id);
  }

  /** POST /api/payments/:paymentId/verify — Customer verifies payment after provider response */
  @Post(':paymentId/verify')
  @Roles(Role.CUSTOMER)
  async verifyPayment(
    @Request() req: any,
    @Param('paymentId') paymentId: string,
    @Body('providerPaymentId') providerPaymentId: string,
    @Body('providerSignature') providerSignature?: string,
    @Body('paymentMethod') paymentMethod?: PaymentMethod,
    @Body('simulateFailure') simulateFailure?: boolean,
  ) {
    return this.paymentsService.verifyPayment(paymentId, req.user.id, {
      providerPaymentId: providerPaymentId || `mock_pay_${Date.now()}`,
      providerSignature,
      paymentMethod,
      simulateFailure,
    });
  }

  /** POST /api/payments/:paymentId/retry — Customer retries a failed payment */
  @Post(':paymentId/retry')
  @Roles(Role.CUSTOMER)
  async retryPayment(
    @Request() req: any,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.retryPayment(paymentId, req.user.id);
  }

  /** GET /api/payments/history — Customer payment history */
  @Get('history')
  @Roles(Role.CUSTOMER)
  async getPaymentHistory(@Request() req: any) {
    return this.paymentsService.getPaymentHistory(req.user.id);
  }

  /** GET /api/payments/orders/:orderId — Get payment for a specific order */
  @Get('orders/:orderId')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async getPaymentByOrder(
    @Request() req: any,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getPaymentByOrder(
      orderId,
      req.user.id,
      req.user.role,
    );
  }

  /** POST /api/payments/:paymentId/refund — Admin initiates a refund */
  @Post(':paymentId/refund')
  @Roles(Role.ADMIN)
  async initiateRefund(
    @Request() req: any,
    @Param('paymentId') paymentId: string,
    @Body('amount') amount: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.initiateRefund(
      paymentId,
      req.user.id,
      amount,
      reason,
    );
  }
}
