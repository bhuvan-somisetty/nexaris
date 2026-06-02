import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSellerRatingDto } from './seller-ratings.dto';

@Injectable()
export class SellerRatingsService {
  constructor(private prisma: PrismaService) {}

  async checkEligibility(sellerId: string, customerId: string) {
    // 1. Verify that the target seller is indeed a SELLER
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller || seller.role !== 'SELLER') {
      throw new NotFoundException('Seller not found.');
    }

    // 2. Check if already rated
    const existingRating = await this.prisma.sellerRating.findUnique({
      where: {
        sellerId_customerId: {
          sellerId,
          customerId,
        },
      },
    });

    if (existingRating) {
      return {
        eligible: false,
        alreadyRated: true,
        reason: 'You have already rated this seller.',
      };
    }

    // 3. Check if customer has a DELIVERED order containing items from this seller
    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: 'DELIVERED',
        items: {
          some: {
            sellerId,
          },
        },
      },
    });

    if (!deliveredOrder) {
      return {
        eligible: false,
        alreadyRated: false,
        reason:
          'Only customers who purchased items from this seller (with a DELIVERED order) can rate them.',
      };
    }

    return { eligible: true, alreadyRated: false };
  }

  async createSellerRating(customerId: string, dto: CreateSellerRatingDto) {
    const eligibility = await this.checkEligibility(dto.sellerId, customerId);
    if (!eligibility.eligible) {
      if (eligibility.alreadyRated) {
        throw new ConflictException(eligibility.reason);
      } else {
        throw new ForbiddenException(eligibility.reason);
      }
    }

    return this.prisma.sellerRating.create({
      data: {
        sellerId: dto.sellerId,
        customerId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        customer: {
          select: {
            email: true,
            profile: true,
          },
        },
      },
    });
  }

  async getRatingsBySeller(
    sellerId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 5;
    const skip = (page - 1) * limit;

    const total = await this.prisma.sellerRating.count({
      where: { sellerId },
    });

    const ratings = await this.prisma.sellerRating.findMany({
      where: { sellerId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Aggregate statistics
    const stats = await this.prisma.sellerRating.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const countsGroup = await this.prisma.sellerRating.groupBy({
      by: ['rating'],
      where: { sellerId },
      _count: { rating: true },
    });

    countsGroup.forEach((g) => {
      const r = g.rating as 1 | 2 | 3 | 4 | 5;
      breakdown[r] = g._count.rating;
    });

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        average: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
        totalRatings: stats._count.rating || 0,
        breakdown,
      },
    };
  }
}
