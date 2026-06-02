import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReportReviewDto,
} from './reviews.dto';
import {
  ReviewStatus,
  ModerationStatus,
  ReportStatus,
  NotificationType,
  Role,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async checkEligibility(productId: string, customerId: string) {
    // 1. Check if user already reviewed
    const existingReview = await this.prisma.review.findUnique({
      where: {
        productId_customerId: {
          productId,
          customerId,
        },
      },
    });

    if (existingReview) {
      return {
        eligible: false,
        alreadyReviewed: true,
        reason: 'You have already reviewed this product.',
      };
    }

    // 2. Check if user has a DELIVERED order containing this product
    const deliveredOrder = await this.prisma.order.findFirst({
      where: {
        customerId,
        status: 'DELIVERED',
        items: {
          some: {
            productId,
          },
        },
      },
    });

    if (!deliveredOrder) {
      return {
        eligible: false,
        alreadyReviewed: false,
        reason:
          'Only customers who purchased this product (with a DELIVERED order) can leave a review.',
      };
    }

    return { eligible: true, alreadyReviewed: false };
  }

  async createReview(customerId: string, dto: CreateReviewDto) {
    const eligibility = await this.checkEligibility(dto.productId, customerId);
    if (!eligibility.eligible) {
      if (eligibility.alreadyReviewed) {
        throw new ConflictException(eligibility.reason);
      } else {
        throw new ForbiddenException(eligibility.reason);
      }
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        customerId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        images: dto.images || [],
        verified: true, // Ensured by DELIVERED order check
        status: ReviewStatus.PUBLISHED,
        moderationStatus: ModerationStatus.APPROVED,
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

    // Emit notification to the seller
    this.eventEmitter.emit('notification.send', {
      userId: product.sellerId,
      type: NotificationType.REVIEW_RECEIVED,
      metadata: {
        productName: product.name,
        rating: dto.rating.toString(),
        title: dto.title,
        reviewId: review.id,
      },
    });

    return review;
  }

  async getReviewsByProduct(
    productId: string,
    query: {
      page?: number;
      limit?: number;
      rating?: number;
      verifiedOnly?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 5;
    const skip = (page - 1) * limit;

    const where: any = {
      productId,
      status: ReviewStatus.PUBLISHED,
    };

    if (query.rating) {
      where.rating = query.rating;
    }

    if (query.verifiedOnly) {
      where.verified = true;
    }

    // Determine sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'helpful') {
      orderBy = { votes: { _count: query.sortOrder || 'desc' } };
    } else if (query.sortBy === 'rating') {
      orderBy = { rating: query.sortOrder || 'desc' };
    } else if (query.sortBy === 'recent') {
      orderBy = { createdAt: query.sortOrder || 'desc' };
    }

    // Fetch total matching reviews
    const total = await this.prisma.review.count({ where });

    // Fetch reviews
    const reviews = await this.prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
        _count: {
          select: {
            votes: true,
          },
        },
      },
    });

    // Fetch aggregate rating stats (using separate count queries for accuracy across rating scale)
    const statsGroup = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        status: ReviewStatus.PUBLISHED,
      },
      _count: {
        rating: true,
      },
      _sum: {
        rating: true,
      },
    });

    let sum = 0;
    let count = 0;
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    statsGroup.forEach((g) => {
      const r = g.rating as 1 | 2 | 3 | 4 | 5;
      const c = g._count.rating || 0;
      breakdown[r] = c;
      sum += g._sum.rating ? Number(g._sum.rating) : 0;
      count += c;
    });

    const average = count > 0 ? Number((sum / count).toFixed(1)) : 0;

    return {
      reviews: reviews.map((r) => ({
        ...r,
        helpfulCount: r._count.votes,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        average,
        totalReviews: count,
        breakdown,
      },
    };
  }

  async updateReview(
    reviewId: string,
    customerId: string,
    dto: UpdateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.customerId !== customerId) {
      throw new ForbiddenException('You can only edit your own reviews.');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating !== undefined ? dto.rating : undefined,
        title: dto.title !== undefined ? dto.title : undefined,
        content: dto.content !== undefined ? dto.content : undefined,
        images: dto.images !== undefined ? dto.images : undefined,
        moderationStatus: ModerationStatus.APPROVED, // Reset to approved on edit
        status: ReviewStatus.PUBLISHED, // Restore visibility on edit
      },
    });
  }

  async deleteReview(reviewId: string, customerId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.customerId !== customerId) {
      throw new ForbiddenException('You can only delete your own reviews.');
    }

    return this.prisma.review.delete({
      where: { id: reviewId },
    });
  }

  async toggleVote(reviewId: string, customerId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    if (review.customerId === customerId) {
      throw new ForbiddenException('You cannot upvote your own review.');
    }

    const existingVote = await this.prisma.reviewVote.findUnique({
      where: {
        reviewId_customerId: {
          reviewId,
          customerId,
        },
      },
    });

    if (existingVote) {
      await this.prisma.reviewVote.delete({
        where: { id: existingVote.id },
      });
      return { voted: false };
    } else {
      await this.prisma.reviewVote.create({
        data: {
          reviewId,
          customerId,
        },
      });
      return { voted: true };
    }
  }

  async reportReview(
    reviewId: string,
    customerId: string,
    dto: ReportReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    // Create Report
    const report = await this.prisma.reviewReport.create({
      data: {
        reviewId,
        customerId,
        reason: dto.reason,
        status: ReportStatus.PENDING,
      },
    });

    // Post-moderation rule: Transition review status to FLAGGED, but keep it PUBLISHED
    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        moderationStatus: ModerationStatus.FLAGGED,
      },
    });

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: review.productId },
      });

      const admin = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN },
      });

      if (admin) {
        this.eventEmitter.emit('notification.send', {
          userId: admin.id,
          type: NotificationType.REVIEW_REPORTED,
          metadata: {
            reviewId,
            productName: product?.name || 'Unknown Product',
            reason: dto.reason,
          },
        });
      }
    } catch (err) {
      // Don't fail the reporting process if notification fails
    }

    return report;
  }

  // Get reviews of products owned by a specific seller
  async getReviewsForSeller(
    sellerId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      product: {
        sellerId,
      },
      status: ReviewStatus.PUBLISHED,
    };

    const total = await this.prisma.review.count({ where });

    const reviews = await this.prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        customer: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Admin Moderation Methods ──────────────────────────────────────────────

  async getFlaggedReviews(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      moderationStatus: ModerationStatus.FLAGGED,
    };

    const total = await this.prisma.review.count({ where });

    const reviews = await this.prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        customer: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdateReviewStatus(reviewId: string, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    const moderationStatus =
      status === ReviewStatus.PUBLISHED
        ? ModerationStatus.APPROVED
        : ModerationStatus.REJECTED;

    // Update review status
    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        moderationStatus,
      },
    });

    // Automatically resolve associated pending reports
    await this.prisma.reviewReport.updateMany({
      where: {
        reviewId,
        status: ReportStatus.PENDING,
      },
      data: {
        status: ReportStatus.RESOLVED,
      },
    });

    return updatedReview;
  }

  async getReports(query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const total = await this.prisma.reviewReport.count();

    const reports = await this.prisma.reviewReport.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        review: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
              },
            },
            customer: {
              select: {
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(reportId: string, status: ReportStatus) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    const updatedReport = await this.prisma.reviewReport.update({
      where: { id: reportId },
      data: { status },
    });

    // If report is dismissed and there are no other pending reports for this review,
    // we can reset the review's moderationStatus if it was flagged.
    if (status === ReportStatus.DISMISSED) {
      const pendingReportsCount = await this.prisma.reviewReport.count({
        where: {
          reviewId: report.reviewId,
          status: ReportStatus.PENDING,
        },
      });

      if (pendingReportsCount === 0) {
        const review = await this.prisma.review.findUnique({
          where: { id: report.reviewId },
        });

        if (review && review.moderationStatus === ModerationStatus.FLAGGED) {
          await this.prisma.review.update({
            where: { id: report.reviewId },
            data: { moderationStatus: ModerationStatus.APPROVED },
          });
        }
      }
    }

    return updatedReport;
  }
}
