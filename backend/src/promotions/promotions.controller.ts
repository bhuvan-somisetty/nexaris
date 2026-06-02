import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Param,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, UserActivityType } from '@prisma/client';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // 1. Log activity trackers (Public hook for recommendation engines)
  @Post('track')
  @UseGuards(OptionalJwtAuthGuard)
  async trackUserActivity(
    @Req() req: any,
    @Body('activityType') activityType: UserActivityType,
    @Body('productId') productId?: string,
    @Body('metadata') metadata?: any,
  ) {
    // If request contains authorization header, extract user context, else log as guest view
    const userId = req.user?.id || null;
    await this.promotionsService.trackUserActivity(
      userId,
      activityType,
      productId,
      metadata,
    );
    return { success: true };
  }

  // 2. Validate Coupons with stacking limitations
  @Post('coupons/validate')
  @UseGuards(JwtAuthGuard)
  async validateCoupon(
    @Req() req: any,
    @Body('codes') codes: string[],
    @Body('subtotal') subtotal: number,
  ) {
    const userId = req.user.id;
    return this.promotionsService.validateDiscount(userId, codes, subtotal);
  }

  // 3. Retrieve customer loyalty profile & milestones
  @Get('loyalty/profile')
  @UseGuards(JwtAuthGuard)
  async getLoyaltyProfile(@Req() req: any) {
    const userId = req.user.id;
    return this.promotionsService.getLoyaltyProfile(userId);
  }

  // 4. Retrieve points history
  @Get('loyalty/history')
  @UseGuards(JwtAuthGuard)
  async getLoyaltyHistory(@Req() req: any) {
    const userId = req.user.id;
    return this.promotionsService.getLoyaltyHistory(userId);
  }

  // 5. Generate or fetch personal Referral Code
  @Post('referral/code')
  @UseGuards(JwtAuthGuard)
  async getReferralCode(@Req() req: any) {
    const userId = req.user.id;
    const code = await this.promotionsService.generateReferralCode(userId);
    return { code };
  }

  // 6. Apply referral signup code during registration (Public)
  @Post('referral/apply')
  async applyReferralCode(
    @Body('refereeId') refereeId: string,
    @Body('code') code: string,
  ) {
    await this.promotionsService.trackReferralRegistration(refereeId, code);
    return { success: true };
  }

  // 7. Create A/B Campaign variants (Seller / Admin)
  @Post('campaigns/ab')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async createABTestCampaign(@Req() req: any, @Body() body: any) {
    const sellerId = req.user.id;
    return this.promotionsService.createABTestCampaign(sellerId, body);
  }

  // 8. Load Marketing and Campaign Performance Metrics
  @Get('seller/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async getMarketingDashboard(@Req() req: any) {
    const sellerId = req.user.id;
    return this.promotionsService.getMarketingDashboard(sellerId);
  }

  // 9. Create standard Coupon
  @Post('coupons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async createCoupon(@Req() req: any, @Body() body: any) {
    const sellerId = req.user.role === Role.ADMIN ? null : req.user.id;
    return this.promotionsService.createCoupon(sellerId, body);
  }

  // 10. Create standard Campaign
  @Post('campaigns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  async createCampaign(@Req() req: any, @Body() body: any) {
    const sellerId = req.user.role === Role.ADMIN ? null : req.user.id;
    return this.promotionsService.createCampaign(sellerId, body);
  }
}
