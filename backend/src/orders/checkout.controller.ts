import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('checkout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post()
  async checkout(
    @Request() req: any,
    @Body('addressId') addressId?: string,
    @Body('newAddress') newAddress?: any,
    @Body('couponCodes') couponCodes?: string[],
  ) {
    const userId = req.user.id;
    return this.checkoutService.processCheckout(userId, { addressId, newAddress, couponCodes });
  }
}
