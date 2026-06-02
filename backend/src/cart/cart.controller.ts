import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Request() req: any) {
    const userId = req.user.id;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  async addItem(
    @Request() req: any,
    @Body('productId') productId: string,
    @Body('variantId') variantId?: string | null,
    @Body('quantity') quantity: number = 1,
  ) {
    const userId = req.user.id;
    return this.cartService.addItem(userId, productId, variantId, quantity);
  }

  @Put('items/:id')
  async updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    const userId = req.user.id;
    return this.cartService.updateItem(userId, id, quantity);
  }

  @Delete('items/:id')
  async removeItem(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.cartService.removeItem(userId, id);
  }

  @Delete()
  async clearCart(@Request() req: any) {
    const userId = req.user.id;
    return this.cartService.clearCart(userId);
  }
}
