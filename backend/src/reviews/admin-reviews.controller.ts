import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ReviewStatus, ReportStatus } from '@prisma/client';

@Controller('admin/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('flagged')
  async getFlaggedReviews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getFlaggedReviews({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id/status')
  async updateReviewStatus(
    @Param('id') id: string,
    @Body('status') status: ReviewStatus,
  ) {
    return this.reviewsService.adminUpdateReviewStatus(id, status);
  }

  @Get('reports')
  async getReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getReports({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body('status') status: ReportStatus,
  ) {
    return this.reviewsService.resolveReport(id, status);
  }
}
