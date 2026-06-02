import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, OrderStatus, FulfillmentStatus } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async getOrders(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
  ) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.findAll(userId, role, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.SELLER, Role.ADMIN)
  async getOrderById(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.findOne(id, userId, role);
  }

  @Patch('items/:orderItemId/fulfillment')
  @Roles(Role.SELLER, Role.ADMIN)
  async updateFulfillment(
    @Request() req: any,
    @Param('orderItemId') orderItemId: string,
    @Body('status') status: FulfillmentStatus,
    @Body('notes') notes?: string,
  ) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.updateFulfillmentStatus(
      userId,
      role,
      orderItemId,
      status,
      notes,
    );
  }

  @Post(':id/cancel')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  async cancelOrder(
    @Request() req: any,
    @Param('id') id: string,
    @Body('notes') notes?: string,
  ) {
    const userId = req.user.id;
    const role = req.user.role;
    return this.ordersService.cancelOrder(userId, role, id, notes);
  }

  @Patch(':id/admin-override')
  @Roles(Role.ADMIN)
  async adminOverride(
    @Request() req: any,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('notes') notes?: string,
  ) {
    const userId = req.user.id;
    return this.ordersService.adminOverrideStatus(userId, id, status, notes);
  }
}
