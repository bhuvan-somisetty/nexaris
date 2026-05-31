import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  async getWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
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

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
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

    return wishlist;
  }

  async addItem(userId: string, productId: string, variantId?: string | null) {
    const wishlist = await this.getWishlist(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException('Product not found or unavailable');
    }

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Selected product variation not found');
      }
    }

    // Check if it already exists
    const existing = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
        variantId: variantId || null,
      },
    });

    if (!existing) {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
          variantId: variantId || null,
        },
      });
    }

    return this.getWishlist(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const wishlist = await this.getWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.wishlistId !== wishlist.id) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: itemId },
    });

    return this.getWishlist(userId);
  }

  async moveToCart(userId: string, itemId: string) {
    const wishlist = await this.getWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
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

    if (!item || item.wishlistId !== wishlist.id) {
      throw new NotFoundException('Wishlist item not found');
    }

    // Verify stock availability
    let availableStock = 0;
    if (item.variantId) {
      availableStock = item.variant?.inventory?.quantity ?? 0;
    } else {
      availableStock = item.product?.inventory?.quantity ?? 0;
    }

    if (availableStock <= 0) {
      throw new BadRequestException('This product is out of stock and cannot be moved to your cart.');
    }

    // Delegate addition to CartService
    const cartResult = await this.cartService.addItem(userId, item.productId, item.variantId, 1);

    // Delete item from Wishlist on successful cart migration
    await this.prisma.wishlistItem.delete({
      where: { id: itemId },
    });

    const updatedWishlist = await this.getWishlist(userId);

    return {
      wishlist: updatedWishlist,
      cart: cartResult.cart,
      message: cartResult.message || 'Moved item to cart successfully',
    };
  }
}
