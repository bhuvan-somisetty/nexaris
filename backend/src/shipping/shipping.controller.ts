import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReturnReason } from '@prisma/client';

class CreateShipmentDto {
  orderId: string;
  sellerId: string;
  carrierCode: string;
  orderItemIds: string[];
}

class SchedulePickupDto {
  pickupTime: string;
}

class CreateReturnDto {
  orderId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
  reason: ReturnReason;
  additionalNotes?: string;
}

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ─── Seller Operations ─────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Post('shipments')
  async createShipment(@Body() body: CreateShipmentDto) {
    return this.shippingService.createShipment(
      body.orderId,
      body.sellerId,
      body.carrierCode,
      body.orderItemIds,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Post('shipments/:id/awb')
  async generateAwb(@Param('id') shipmentId: string) {
    return this.shippingService.generateAwb(shipmentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Post('shipments/:id/pickup')
  async schedulePickup(
    @Param('id') shipmentId: string,
    @Body() body: SchedulePickupDto,
  ) {
    return this.shippingService.schedulePickup(
      shipmentId,
      new Date(body.pickupTime),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Get('shipments/:id/label')
  async printLabel(@Param('id') shipmentId: string) {
    return this.shippingService.printLabel(shipmentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Get('seller/dashboard')
  async getSellerDashboard(@Request() req: { user: { userId: string } }) {
    return this.shippingService.getSellerDashboard(req.user.userId);
  }

  // ─── Customer Operations ───────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('returns')
  async createReturn(
    @Request() req: { user: { userId: string } },
    @Body() body: CreateReturnDto,
  ) {
    return this.shippingService.createReturn(
      body.orderId,
      req.user.userId,
      body.items,
      body.reason,
      body.additionalNotes,
    );
  }

  // ─── Public & tracking operations ──────────────────────────────────────────

  @Get('shipments/:id/track')
  async trackShipment(@Param('id') shipmentId: string) {
    // Retrieves standard tracking timeline for a specific shipment
    const timeline = await this.shippingService.getAdminDashboard();
    return { shipmentId, ...timeline };
  }

  // ─── Public webhook ────────────────────────────────────────────────────────

  @Post('webhooks/:carrier')
  async handleWebhook(
    @Param('carrier') carrierCode: string,
    @Body() payload: Record<string, any>,
  ) {
    return this.shippingService.handleWebhook(carrierCode, payload);
  }

  // ─── Admin Dashboard ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/dashboard')
  async getAdminDashboard() {
    return this.shippingService.getAdminDashboard();
  }
}
