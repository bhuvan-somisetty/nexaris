import { Controller, Get, Post, Query, Param, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 1. Log product view (Public)
  @Post('products/:id/view')
  async recordView(@Param('id') id: string) {
    await this.analyticsService.recordProductView(id);
    return { success: true };
  }

  // 2. Dashboard Summary
  @Get('seller/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getDashboardSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sellerId = req.user.id;
    return this.analyticsService.getDashboardSummary(sellerId, startDate, endDate);
  }

  // 3. Product Analytics & Inventory alerts
  @Get('seller/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getProductAnalytics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sellerId = req.user.id;
    return this.analyticsService.getProductAnalytics(sellerId, startDate, endDate);
  }

  // 4. Customer insights
  @Get('seller/customers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getCustomerAnalytics(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sellerId = req.user.id;
    return this.analyticsService.getCustomerAnalytics(sellerId, startDate, endDate);
  }

  // 5. Daily trends
  @Get('seller/trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getTrendsData(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sellerId = req.user.id;
    return this.analyticsService.getTrendsData(sellerId, startDate, endDate);
  }

  // 6. Real-time widgets today
  @Get('seller/realtime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getRealTimeAnalytics(@Req() req: any) {
    const sellerId = req.user.id;
    return this.analyticsService.getRealTimeAnalytics(sellerId);
  }

  // 7. Seller Business Health Score
  @Get('seller/health-score')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getBusinessHealthScore(@Req() req: any) {
    const sellerId = req.user.id;
    return this.analyticsService.getBusinessHealthScore(sellerId);
  }

  // 8. Forecasting projections (7 and 30 days)
  @Get('seller/forecasting')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async getForecasting(@Req() req: any) {
    const sellerId = req.user.id;
    return this.analyticsService.getForecasting(sellerId);
  }

  // 9. Export report (CSV format)
  @Get('seller/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  async exportReport(
    @Req() req: any,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const sellerId = req.user.id;
    const csvContent = await this.analyticsService.generateCSVReport(sellerId, startDate, endDate);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=nexaris_seller_report_${new Date().toISOString().split('T')[0]}.csv`);
    return res.status(200).send(csvContent);
  }
}
