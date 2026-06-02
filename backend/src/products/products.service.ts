import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  ProductStatus,
  SellerStatus,
  NotificationType,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: {
    search?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: ProductStatus;
    sellerId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    // 1. Filter by Publish Status
    if (query.status) {
      where.status = query.status;
    } else {
      // By default, public search only shows PUBLISHED items
      where.status = ProductStatus.PUBLISHED;
    }

    // 2. Filter by Seller
    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    // 3. Search text
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // 4. Filter by Category & Subcategories
    if (query.categoryId) {
      // Recursively fetch all subcategory IDs
      const categoryIds = await this.getAllSubcategoryIds(query.categoryId);
      where.categoryId = { in: categoryIds };
    }

    // 5. Price range
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) {
        where.price.gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        where.price.lte = query.maxPrice;
      }
    }

    // 6. Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          images: true,
          category: true,
          seller: {
            select: {
              id: true,
              email: true,
              sellerProfile: true,
            },
          },
          variants: {
            include: {
              inventory: true,
            },
          },
          inventory: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getAllSubcategoryIds(categoryId: string): Promise<string[]> {
    const list = [categoryId];
    const fetchChildren = async (id: string) => {
      const children = await this.prisma.category.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      for (const child of children) {
        list.push(child.id);
        await fetchChildren(child.id);
      }
    };
    await fetchChildren(categoryId);
    return list;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
        attributes: true,
        variants: {
          include: {
            inventory: true,
          },
        },
        inventory: true,
        seller: {
          select: {
            id: true,
            email: true,
            profile: true,
            sellerProfile: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        category: true,
        attributes: true,
        variants: {
          include: {
            inventory: true,
          },
        },
        inventory: true,
        seller: {
          select: {
            id: true,
            email: true,
            profile: true,
            sellerProfile: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(sellerId: string, data: any) {
    // 1. Verify seller is approved
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (
      !seller ||
      seller.role !== Role.SELLER ||
      seller.sellerProfile?.status !== SellerStatus.APPROVED
    ) {
      throw new ForbiddenException('Only approved sellers can list products.');
    }

    // 2. Generate slug
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') +
      '-' +
      Date.now().toString().slice(-4);

    // 3. Verify SKU uniqueness
    if (data.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new ConflictException('Product SKU already exists');
      }
    }

    // Validate category
    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // 4. Create in Transaction
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          categoryId: data.categoryId,
          name: data.name,
          slug,
          description: data.description,
          price: data.price,
          sku: data.sku || null,
          status: ProductStatus.DRAFT, // Always drafts on creation
        },
      });

      // Create Images
      if (data.images && data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img: any) => ({
            productId: product.id,
            url: img.url,
            altText: img.altText || null,
            isMain: img.isMain || false,
          })),
        });
      }

      // Create Attributes
      if (data.attributes && data.attributes.length > 0) {
        await tx.productAttribute.createMany({
          data: data.attributes.map((attr: any) => ({
            productId: product.id,
            name: attr.name,
            value: attr.value,
          })),
        });
      }

      // Create Variants & Variant Inventory, or Simple Product Inventory
      if (data.variants && data.variants.length > 0) {
        for (const variant of data.variants) {
          const v = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: variant.sku,
              name: variant.name,
              price: variant.price || null,
              options: variant.options,
            },
          });

          await tx.inventory.create({
            data: {
              variantId: v.id,
              quantity: variant.quantity || 0,
              lowStockThreshold: variant.lowStockThreshold || 5,
            },
          });
        }
      } else {
        // Create inventory for simple product
        await tx.inventory.create({
          data: {
            productId: product.id,
            quantity: data.quantity || 0,
            lowStockThreshold: data.lowStockThreshold || 5,
          },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: sellerId,
          action: 'PRODUCT_CREATE',
          entity: 'PRODUCT',
          entityId: product.id,
          newValue: {
            name: product.name,
            price: product.price,
            sku: product.sku,
          },
        },
      });

      return product;
    });
  }

  async update(id: string, userId: string, userRole: Role, data: any) {
    const product = await this.findOne(id);

    // Verify Ownership
    if (userRole === Role.SELLER && product.sellerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this product.',
      );
    }

    // Prepare update parameters
    const updateData: any = {};
    if (data.name) {
      updateData.name = data.name;
      // Slug update is optional; usually we keep it persistent, but we can generate a new one if name changes drastically
    }
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.sku !== undefined) {
      if (data.sku) {
        const existingSku = await this.prisma.product.findFirst({
          where: { sku: data.sku, NOT: { id } },
        });
        if (existingSku) {
          throw new ConflictException('Product SKU already exists');
        }
      }
      updateData.sku = data.sku || null;
    }
    if (
      data.status &&
      (userRole === Role.ADMIN ||
        data.status === ProductStatus.DRAFT ||
        data.status === ProductStatus.PENDING_REVIEW)
    ) {
      // Sellers can only toggle between DRAFT and PENDING_REVIEW; admins can set any status
      updateData.status = data.status;
    }
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      updateData.categoryId = data.categoryId;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: updateData,
      });

      // Update Attributes (Simple strategy: delete old and write new)
      if (data.attributes) {
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        if (data.attributes.length > 0) {
          await tx.productAttribute.createMany({
            data: data.attributes.map((attr: any) => ({
              productId: id,
              name: attr.name,
              value: attr.value,
            })),
          });
        }
      }

      // Update Images
      if (data.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (data.images.length > 0) {
          await tx.productImage.createMany({
            data: data.images.map((img: any) => ({
              productId: id,
              url: img.url,
              altText: img.altText || null,
              isMain: img.isMain || false,
            })),
          });
        }
      }

      // Update simple product inventory quantity
      if (data.quantity !== undefined && !product.variants.length) {
        await tx.inventory.update({
          where: { productId: id },
          data: {
            quantity: data.quantity,
            lowStockThreshold:
              data.lowStockThreshold !== undefined
                ? data.lowStockThreshold
                : undefined,
          },
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId,
          action: 'PRODUCT_UPDATE',
          entity: 'PRODUCT',
          entityId: id,
          oldValue: { status: product.status, price: product.price },
          newValue: { status: updated.status, price: updated.price },
        },
      });

      return updated;
    });

    if (result.status !== product.status) {
      if (result.status === ProductStatus.PUBLISHED) {
        this.eventEmitter.emit('notification.send', {
          userId: product.sellerId,
          type: NotificationType.PRODUCT_APPROVED,
          metadata: {
            productName: result.name,
          },
        });
      } else if (result.status === ProductStatus.REJECTED) {
        this.eventEmitter.emit('notification.send', {
          userId: product.sellerId,
          type: NotificationType.PRODUCT_REJECTED,
          metadata: {
            productName: result.name,
          },
        });
      }
    }

    return result;
  }

  async delete(id: string, userId: string, userRole: Role) {
    const product = await this.findOne(id);

    // Verify ownership
    if (userRole === Role.SELLER && product.sellerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this product.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PRODUCT_DELETE',
          entity: 'PRODUCT',
          entityId: id,
          oldValue: { name: product.name, sku: product.sku },
        },
      });
    });

    return { success: true };
  }
}
