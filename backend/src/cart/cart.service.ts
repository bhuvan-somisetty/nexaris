import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
                inventory: true,
              },
            },
            variant: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: true,
                  category: true,
                  inventory: true,
                },
              },
              variant: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });
    }

    return cart;
  }

  async addItem(
    userId: string,
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const cart = await this.getCart(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        inventory: true,
      },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found or unavailable');
    }

    // Check if product requires a variant selection
    if (product.variants.length > 0 && !variantId) {
      throw new BadRequestException(
        'This product has variations. Please select an option.',
      );
    }

    let availableStock = 0;
    let variantName = '';

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { inventory: true },
      });

      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Selected product variation not found');
      }

      availableStock = variant.inventory?.quantity ?? 0;
      variantName = variant.name;
    } else {
      availableStock = product.inventory?.quantity ?? 0;
    }

    if (availableStock <= 0) {
      throw new BadRequestException('This item is currently out of stock.');
    }

    // Check if item already exists in the cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
      },
    });

    const currentQty = existingItem ? existingItem.quantity : 0;
    let targetQty = currentQty + quantity;
    let message: string | undefined;

    if (targetQty > availableStock) {
      targetQty = availableStock;
      message = `Requested quantity exceeds stock. Added maximum available quantity (${availableStock}) of ${product.name}${variantName ? ` (${variantName})` : ''}.`;
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: targetQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity: targetQty,
        },
      });
    }

    const updatedCart = await this.getCart(userId);
    return { cart: updatedCart, message };
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.getCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        product: {
          include: { inventory: true },
        },
        variant: {
          include: { inventory: true },
        },
      },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
      const updatedCart = await this.getCart(userId);
      return { cart: updatedCart, message: 'Item removed from cart' };
    }

    let availableStock = 0;
    if (item.variantId) {
      availableStock = item.variant?.inventory?.quantity ?? 0;
    } else {
      availableStock = item.product?.inventory?.quantity ?? 0;
    }

    let targetQty = quantity;
    let message: string | undefined;

    if (targetQty > availableStock) {
      targetQty = availableStock;
      message = `Only ${availableStock} items are in stock. Quantity adjusted accordingly.`;
    }

    if (targetQty <= 0) {
      await this.prisma.cartItem.delete({
        where: { id: itemId },
      });
      message = 'Item removed due to zero available stock.';
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: targetQty },
      });
    }

    const updatedCart = await this.getCart(userId);
    return { cart: updatedCart, message };
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.getCart(userId);
  }
}
