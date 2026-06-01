import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType, LoyaltyTier, UserActivityType, CampaignType } from '@prisma/client';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Referral System ───
  async generateReferralCode(userId: string): Promise<string> {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) return existing.code;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const namePart = user?.profile?.firstName 
      ? user.profile.firstName.toUpperCase().substring(0, 4) 
      : 'NEX';
    
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const code = `REF-${namePart}-${randomPart}`;

    const created = await this.prisma.referralCode.create({
      data: {
        userId,
        code,
      },
    });

    return created.code;
  }

  async trackReferralRegistration(refereeId: string, referralCodeStr: string): Promise<void> {
    const codeRecord = await this.prisma.referralCode.findUnique({
      where: { code: referralCodeStr },
    });
    if (!codeRecord) return;

    // Prevent self-referral
    if (codeRecord.userId === refereeId) return;

    try {
      await this.prisma.referral.create({
        data: {
          referrerId: codeRecord.userId,
          refereeId,
          rewardClaimed: false,
        },
      });
      this.logger.log(`User ${refereeId} successfully referred by ${codeRecord.userId}`);
    } catch (err: any) {
      this.logger.error(`Referral tracking failed: ${err.message}`);
    }
  }

  // Award referral bonuses on referee's first purchase
  async processReferralPurchaseRewards(refereeId: string, orderId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { refereeId },
    });
    if (!referral || referral.rewardClaimed) return;

    // Verify first purchase
    const ordersCount = await this.prisma.order.count({
      where: { customerId: refereeId, status: { notIn: ['CANCELLED', 'PAYMENT_FAILED'] } },
    });
    if (ordersCount > 1) return; // not first purchase

    // Reward referrer: e.g. 500 Loyalty points
    await this.awardLoyaltyPoints(referral.referrerId, 500, `Referral reward for inviting user id: ${refereeId}`);
    
    // Reward referee: e.g. 200 Loyalty points
    await this.awardLoyaltyPoints(refereeId, 200, `First purchase referral sign-up bonus`);

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { rewardClaimed: true },
    });
  }

  // ─── Loyalty & Rewards System ───
  async getLoyaltyProfile(userId: string) {
    let profile = await this.prisma.loyaltyProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      profile = await this.prisma.loyaltyProfile.create({
        data: {
          userId,
          points: 0,
          tier: LoyaltyTier.BRONZE,
        },
      });
    }
    return profile;
  }

  async getLoyaltyHistory(userId: string) {
    return this.prisma.loyaltyHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async awardLoyaltyPoints(userId: string, points: number, reason: string): Promise<void> {
    if (points === 0) return;
    
    await this.prisma.$transaction(async (tx) => {
      let profile = await tx.loyaltyProfile.findUnique({ where: { userId } });
      if (!profile) {
        profile = await tx.loyaltyProfile.create({
          data: { userId, points: 0, tier: LoyaltyTier.BRONZE },
        });
      }

      const newPoints = Math.max(0, profile.points + points);
      
      // Calculate dynamic tier: Bronze (<1000), Silver (1000-2499), Gold (2500-4999), Platinum (5000+)
      let tier: LoyaltyTier = LoyaltyTier.BRONZE;
      if (newPoints >= 5000) tier = LoyaltyTier.PLATINUM;
      else if (newPoints >= 2500) tier = LoyaltyTier.GOLD;
      else if (newPoints >= 1000) tier = LoyaltyTier.SILVER;

      await tx.loyaltyProfile.update({
        where: { id: profile.id },
        data: { points: newPoints, tier },
      });

      await tx.loyaltyHistory.create({
        data: {
          userId,
          pointsChange: points,
          reason,
        },
      });
    });
  }

  // ─── Coupon Stacking Validation Rules ───
  async validateDiscount(userId: string, couponCodes: string[], subtotal: number) {
    if (couponCodes.length === 0) {
      return { discountAmount: 0, freeShipping: false, couponsApplied: [] };
    }

    // Split coupons into Standard Discounts vs Free Shipping
    const coupons = await this.prisma.coupon.findMany({
      where: {
        code: { in: couponCodes },
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const discountCoupons = coupons.filter(c => c.discountType !== DiscountType.FREE_SHIPPING);
    const shippingCoupons = coupons.filter(c => c.discountType === DiscountType.FREE_SHIPPING);

    // Enforce coupon stacking limits
    if (discountCoupons.length > 1) {
      throw new BadRequestException('Stacking violation: Only one discount coupon is allowed per order.');
    }

    let discountAmount = 0;
    let freeShipping = false;
    const appliedCodes: string[] = [];

    // Process single standard discount coupon
    if (discountCoupons.length > 0) {
      const promo = discountCoupons[0];
      
      if (subtotal < Number(promo.minOrderValue)) {
        throw new BadRequestException(`Order subtotal must be at least ₹${promo.minOrderValue} to use coupon: ${promo.code}`);
      }

      // Check usage counts
      if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
        throw new BadRequestException(`Coupon ${promo.code} usage limit exceeded.`);
      }

      // Check per-user limit
      const userRedemptions = await this.prisma.couponRedemption.count({
        where: { couponId: promo.id, customerId: userId },
      });
      if (userRedemptions >= promo.perUserLimit) {
        throw new BadRequestException(`You have reached the redemption limit for coupon: ${promo.code}`);
      }

      // Calculate deduction
      if (promo.discountType === DiscountType.PERCENTAGE) {
        let valueDeducted = (subtotal * Number(promo.value)) / 100;
        if (promo.maxDiscountAmount !== null) {
          valueDeducted = Math.min(valueDeducted, Number(promo.maxDiscountAmount));
        }
        discountAmount += valueDeducted;
      } else if (promo.discountType === DiscountType.FIXED_AMOUNT) {
        discountAmount += Math.min(subtotal, Number(promo.value));
      }
      appliedCodes.push(promo.code);
    }

    // Process free shipping coupon
    if (shippingCoupons.length > 0) {
      const promo = shippingCoupons[0];
      if (subtotal >= Number(promo.minOrderValue)) {
        freeShipping = true;
        appliedCodes.push(promo.code);
      }
    }

    return {
      discountAmount: Number(discountAmount.toFixed(2)),
      freeShipping,
      couponsApplied: appliedCodes,
    };
  }

  // Atomically increment coupon used counts (concurrency protection check-and-set)
  async incrementCouponUsage(code: string): Promise<void> {
    const result = await this.prisma.coupon.updateMany({
      where: {
        code,
        isActive: true,
        endDate: { gte: new Date() },
        OR: [
          { usageLimit: null },
          { usedCount: { lt: this.prisma.coupon.fields.usageLimit } },
        ],
      },
      data: {
        usedCount: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(`Failed to apply coupon: ${code}. Limit reached or expired.`);
    }
  }

  // ─── A/B Testing Campaigns ───
  async createABTestCampaign(sellerId: string, campaignData: any) {
    const { name, description, categoryId, discountType, valueA, valueB, startDate, endDate } = campaignData;

    // Create Parent AB Campaign anchor
    const parent = await this.prisma.campaign.create({
      data: {
        name,
        description,
        type: CampaignType.FLASH_SALE,
        discountType,
        value: 0,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        sellerId,
        categoryId,
        abTest: true,
      },
    });

    // Create Variant A
    const variantA = await this.prisma.campaign.create({
      data: {
        name: `${name} (Variant A)`,
        description,
        type: CampaignType.FLASH_SALE,
        discountType,
        value: valueA,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        sellerId,
        categoryId,
        abTest: true,
        variant: 'A',
        parentCampaignId: parent.id,
      },
    });

    // Create Variant B
    const variantB = await this.prisma.campaign.create({
      data: {
        name: `${name} (Variant B)`,
        description,
        type: CampaignType.FLASH_SALE,
        discountType,
        value: valueB,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        sellerId,
        categoryId,
        abTest: true,
        variant: 'B',
        parentCampaignId: parent.id,
      },
    });

    return {
      parent,
      variantA,
      variantB,
    };
  }

  async trackCampaignAction(campaignId: string, action: 'click' | 'conversion' | 'revenue', value = 0): Promise<void> {
    try {
      if (action === 'click') {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { clicks: { increment: 1 } },
        });
      } else if (action === 'conversion') {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { conversions: { increment: 1 } },
        });
      } else if (action === 'revenue') {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { revenue: { increment: value } },
        });
      }
    } catch (err: any) {
      this.logger.error(`Failed to track campaign action: ${err.message}`);
    }
  }

  // ─── User Activity Logging (Phase 11 Pre-hooks) ───
  async trackUserActivity(
    userId: string | null,
    activityType: UserActivityType,
    productId?: string,
    metadata?: any,
  ) {
    try {
      await this.prisma.userActivity.create({
        data: {
          userId,
          activityType,
          productId,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.error(`User activity log failed: ${err.message}`);
    }
  }

  // Fetch marketing ROI performance dashboard metrics
  async getMarketingDashboard(sellerId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { sellerId },
      include: {
        childCampaigns: true,
      },
    });

    const coupons = await this.prisma.coupon.findMany({
      where: { sellerId },
    });

    // Compute basic totals
    let totalClicks = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    for (const c of campaigns) {
      totalClicks += c.clicks;
      totalConversions += c.conversions;
      totalRevenue += Number(c.revenue);
    }

    const conversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    return {
      campaigns,
      coupons,
      summary: {
        totalClicks,
        totalConversions,
        conversionRate,
        revenueGenerated: totalRevenue,
      },
    };
  }

  async createCoupon(sellerId: string | null, data: any) {
    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        value: data.value,
        minOrderValue: data.minOrderValue || 0,
        maxDiscountAmount: data.maxDiscountAmount || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        usageLimit: data.usageLimit || null,
        perUserLimit: data.perUserLimit || 1,
        sellerId,
        isActive: true,
      },
    });
  }

  async createCampaign(sellerId: string | null, data: any) {
    const campaign = await this.prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        discountType: data.discountType,
        value: data.value,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        sellerId,
        categoryId: data.categoryId || null,
        isActive: true,
      },
    });

    if (data.productIds && data.productIds.length > 0) {
      await this.prisma.campaignProduct.createMany({
        data: data.productIds.map((pid: string) => ({
          campaignId: campaign.id,
          productId: pid,
        })),
      });
    }

    return campaign;
  }
}
