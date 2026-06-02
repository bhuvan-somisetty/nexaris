import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  async getWishlist(@Request() req: any) {
    const userId = req.user.id;
    return this.wishlistService.getWishlist(userId);
  }

  @Post('items')
  async addItem(
    @Request() req: any,
    @Body('productId') productId: string,
    @Body('variantId') variantId?: string | null,
  ) {
    const userId = req.user.id;
    return this.wishlistService.addItem(userId, productId, variantId);
  }

  @Delete('items/:id')
  async removeItem(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.wishlistService.removeItem(userId, id);
  }

  @Post('items/:id/move-to-cart')
  async moveToCart(@Request() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    return this.wishlistService.moveToCart(userId, id);
  }
}
