import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get(':productId')
  async getInventory(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }

  @Patch(':id')
  async updateStock(
    @Param('id') id: string,
    @Request() req: any,
    @Body('quantity') quantity: number,
    @Body('lowStockThreshold') lowStockThreshold?: number,
  ) {
    const userId = req.user.id;
    const userRole = req.user.role;
    return this.inventoryService.update(id, userId, userRole, quantity, lowStockThreshold);
  }
}
