import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findByProduct(productId: string) {
    // 1. Fetch simple product inventory
    const simpleInventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (simpleInventory) {
      return [simpleInventory];
    }

    // 2. Fetch variant inventory
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      include: { inventory: true },
    });

    if (variants.length === 0) {
      throw new NotFoundException('Inventory not found for this product');
    }

    return variants.map(v => v.inventory).filter(i => i !== null);
  }

  async update(id: string, userId: string, userRole: Role, quantity: number, lowStockThreshold?: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id },
      include: {
        product: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    // Verify ownership
    const sellerId = inventory.product?.sellerId || inventory.variant?.product?.sellerId;
    if (userRole === Role.SELLER && sellerId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this stock.');
    }

    const data: any = { quantity };
    if (lowStockThreshold !== undefined) {
      data.lowStockThreshold = lowStockThreshold;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id },
        data,
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'INVENTORY_ADJUST',
          entity: 'INVENTORY',
          entityId: id,
          oldValue: { quantity: inventory.quantity },
          newValue: { quantity: updated.quantity },
        },
      });

      return updated;
    });
  }
}
