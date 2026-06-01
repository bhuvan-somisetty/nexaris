import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class LogEventDto {
  recommendationType: string;
  productId: string;
  interaction: string;
}

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  // ─── Home Feed ─────────────────────────────────────────────────────────────

  @UseGuards(OptionalJwtAuthGuard)
  @Get('home')
  async getHome(
    @Request() req: { user?: { userId: string } },
    @Query('limit', new DefaultValuePipe(16), ParseIntPipe) limit: number,
  ) {
    const userId = req.user?.userId ?? null;
    return this.recommendationsService.getHomeRecommendations(userId, limit);
  }

  // ─── Similar Products ──────────────────────────────────────────────────────

  @Get('products/:id/similar')
  async getSimilar(
    @Param('id') productId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getSimilarProducts(productId, limit);
  }

  // ─── Frequently Bought Together ────────────────────────────────────────────

  @Get('products/:id/frequently-bought')
  async getFrequentlyBought(
    @Param('id') productId: string,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getFrequentlyBoughtTogether(
      productId,
      limit,
    );
  }

  // ─── Customers Also Viewed ─────────────────────────────────────────────────

  @Get('products/:id/also-viewed')
  async getAlsoViewed(
    @Param('id') productId: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getCustomersAlsoViewed(productId, limit);
  }

  // ─── Trending ──────────────────────────────────────────────────────────────

  @Get('trending')
  async getTrending(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getTrending(limit);
  }

  // ─── Personalized ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('personalized')
  async getPersonalized(
    @Request() req: { user: { userId: string } },
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getPersonalized(req.user.userId, limit);
  }

  // ─── Recently Viewed ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('recently-viewed')
  async getRecentlyViewed(
    @Request() req: { user: { userId: string } },
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return this.recommendationsService.getRecentlyViewed(
      req.user.userId,
      limit,
    );
  }

  // ─── Category Recommendations ──────────────────────────────────────────────

  @UseGuards(OptionalJwtAuthGuard)
  @Get('categories')
  async getCategories(
    @Request() req: { user?: { userId: string } },
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = req.user?.userId ?? null;
    return this.recommendationsService.getCategoryRecommendations(
      userId,
      limit,
    );
  }

  // ─── Seller Insights ───────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Get('seller/insights')
  async getSellerInsights(@Request() req: { user: { userId: string } }) {
    return this.recommendationsService.getSellerInsights(req.user.userId);
  }

  // ─── Debug ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('debug')
  async getDebug() {
    return this.recommendationsService.getDebugInfo();
  }

  // ─── Log Event ─────────────────────────────────────────────────────────────

  @UseGuards(OptionalJwtAuthGuard)
  @Post('event')
  async logEvent(
    @Request() req: { user?: { userId: string } },
    @Body() body: LogEventDto,
  ) {
    await this.recommendationsService.logEvent({
      userId: req.user?.userId,
      recommendationType: body.recommendationType,
      productId: body.productId,
      interaction: body.interaction,
    });
    return { success: true };
  }
}
