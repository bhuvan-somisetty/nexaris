import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReportReviewDto } from './reviews.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('products/:productId')
  async getReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('rating') rating?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.reviewsService.getReviewsByProduct(productId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      rating: rating ? Number(rating) : undefined,
      verifiedOnly: verifiedOnly === 'true',
      sortBy,
      sortOrder,
    });
  }

  @Get('eligibility/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async checkEligibility(@Param('productId') productId: string, @Request() req: any) {
    const customerId = req.user.id;
    return this.reviewsService.checkEligibility(productId, customerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async createReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    const customerId = req.user.id;
    return this.reviewsService.createReview(customerId, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: any,
  ) {
    const customerId = req.user.id;
    return this.reviewsService.updateReview(id, customerId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async deleteReview(@Param('id') id: string, @Request() req: any) {
    const customerId = req.user.id;
    return this.reviewsService.deleteReview(id, customerId);
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async toggleVote(@Param('id') id: string, @Request() req: any) {
    const customerId = req.user.id;
    return this.reviewsService.toggleVote(id, customerId);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async reportReview(
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
    @Request() req: any,
  ) {
    const customerId = req.user.id;
    return this.reviewsService.reportReview(id, customerId, dto);
  }

  @Get('seller')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getSellerReviews(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const sellerId = req.user.id;
    return this.reviewsService.getReviewsForSeller(sellerId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
