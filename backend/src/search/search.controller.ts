import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

class LogClickDto {
  searchQueryLogId: string;
  productId: string;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ─── Search Queries with Facets ──────────────────────────────────────────
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async search(
    @Request() req: { user?: { userId: string } },
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('sellerId') sellerId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: string,
    @Query('rating') rating?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const userId = req.user?.userId ?? null;
    const inStockBool = inStock === 'true';
    return this.searchService.searchProducts(userId, {
      q,
      categoryId,
      brand,
      sellerId,
      minPrice,
      maxPrice,
      inStock: inStockBool,
      rating,
      page,
      limit,
    });
  }

  // ─── Autocomplete Suggestions ──────────────────────────────────────────────
  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    const suggestions = await this.searchService.getAutocompleteSuggestions(q);
    return { suggestions };
  }

  // ─── Trending Searches ─────────────────────────────────────────────────────
  @Get('trending')
  async trending() {
    const queries = await this.searchService.getTrendingSearches();
    return { queries };
  }

  // ─── Search History Management ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Request() req: { user: { userId: string } }) {
    const history = await this.searchService.getSearchHistory(req.user.userId);
    return { history };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('history/:id')
  async clearHistory(
    @Request() req: { user: { userId: string } },
    @Param('id') historyId: string,
  ) {
    await this.searchService.clearSearchHistory(req.user.userId, historyId);
    return { success: true };
  }

  // ─── Click Analytics Logger ────────────────────────────────────────────────
  @Post('click')
  async logClick(@Body() body: LogClickDto) {
    await this.searchService.logSearchClick(body.searchQueryLogId, body.productId);
    return { success: true };
  }

  // ─── Discovery Funnel & Keyword Gaps (Seller Analytics) ───────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @Get('seller/analytics')
  async getSellerAnalytics(@Request() req: { user: { userId: string } }) {
    return this.searchService.getSellerSearchAnalytics(req.user.userId);
  }

  // ─── Recovery Feed: Trending + Categories + Personalized recommendations ──
  @UseGuards(OptionalJwtAuthGuard)
  @Get('recovery')
  async getRecovery(@Request() req: { user?: { userId: string } }) {
    const userId = req.user?.userId ?? null;
    return this.searchService.getRecoveryData(userId);
  }
}
