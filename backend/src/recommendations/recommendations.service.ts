import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  category: { id: string; name: string; slug: string };
  rating?: number;
  score: number;
  reason: string;
}

const CACHE_TTL_SECONDS = 900; // 15 minutes
const DECAY_LAMBDA = 0.1; // Exponential decay constant

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Cache Helpers ───────────────────────────────────────────────────────────

  private async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get<T>(key);
      if (cached !== null) return cached;
    } catch {
      // fallback to DB cache
    }

    try {
      const dbCache = await this.prisma.recommendationCache.findUnique({
        where: { cacheKey: key },
      });
      if (dbCache && dbCache.expiresAt > new Date()) {
        return dbCache.data as T;
      }
    } catch {
      /* ignore */
    }

    return null;
  }

  private async setCache(key: string, data: unknown): Promise<void> {
    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

    try {
      await this.redis.set(key, data, CACHE_TTL_SECONDS);
    } catch {
      /* ignore */
    }

    try {
      await this.prisma.recommendationCache.upsert({
        where: { cacheKey: key },
        create: { cacheKey: key, data: data as never, expiresAt },
        update: { data: data as never, expiresAt },
      });
    } catch {
      /* ignore */
    }
  }

  // ─── Product Shape ──────────────────────────────────────────────────────────

  private shapeProduct(
    p: {
      id: string;
      name: string;
      slug: string;
      price: Decimal;
      images: { url: string; isMain: boolean }[];
      category: { id: string; name: string; slug: string };
      reviews?: { rating: number }[];
    },
    score: number,
    reason: string,
  ): RecommendedProduct {
    const mainImage =
      p.images.find((i) => i.isMain)?.url ?? p.images[0]?.url ?? null;
    const rating =
      p.reviews && p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : undefined;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      image: mainImage,
      category: p.category,
      rating,
      score,
      reason,
    };
  }

  private productSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: { select: { url: true, isMain: true }, take: 1 },
      category: { select: { id: true, name: true, slug: true } },
      reviews: { select: { rating: true } },
    };
  }

  // ─── 1. Similar Products (Content-Based) ──────────────────────────────────

  async getSimilarProducts(
    productId: string,
    limit = 10,
  ): Promise<RecommendedProduct[]> {
    const cacheKey = `similar:${productId}:${limit}`;
    const cached = await this.getCached<RecommendedProduct[]>(cacheKey);
    if (cached) return cached;

    // Try pre-computed similarity table first
    const precomputed = await this.prisma.productSimilarity.findMany({
      where: { productIdA: productId },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        productB: { select: this.productSelect() },
      },
    });

    if (precomputed.length >= Math.min(limit, 3)) {
      const results = precomputed.map((row) =>
        this.shapeProduct(
          row.productB as Parameters<typeof this.shapeProduct>[0],
          Number(row.score),
          'Because you viewed similar products',
        ),
      );
      await this.setCache(cacheKey, results);
      return results;
    }

    // Fallback: on-the-fly content-based filtering
    const source = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        attributes: true,
        category: { select: { id: true, parentId: true } },
      },
    });
    if (!source) return [];

    const candidates = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        OR: [
          { categoryId: source.categoryId },
          {
            category: {
              parentId: source.category.parentId ?? source.categoryId,
            },
          },
        ],
        status: 'PUBLISHED',
      },
      take: 50,
      select: this.productSelect(),
    });

    const sourcePrice = Number(source.price);

    const scored = candidates.map((c) => {
      const priceScore =
        sourcePrice > 0
          ? Math.max(
              0,
              1 - Math.abs(Number(c.price) - sourcePrice) / sourcePrice,
            )
          : 0.5;
      const score = priceScore * 0.7 + 0.3;
      return {
        product: c,
        score: Math.round(score * 100) / 100,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored
      .slice(0, limit)
      .map(({ product, score }) =>
        this.shapeProduct(
          product as Parameters<typeof this.shapeProduct>[0],
          score,
          'Because you viewed similar products',
        ),
      );
    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── 2. Frequently Bought Together (Co-purchase Collaborative) ────────────

  async getFrequentlyBoughtTogether(
    productId: string,
    limit = 8,
  ): Promise<RecommendedProduct[]> {
    const cacheKey = `fbt:${productId}:${limit}`;
    const cached = await this.getCached<RecommendedProduct[]>(cacheKey);
    if (cached) return cached;

    // Find orders that contain this product
    const coOrders = await this.prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
    });

    if (coOrders.length === 0)
      return this.getTrending(limit, 'Frequently bought on Nexaris');

    const orderIds = [...new Set(coOrders.map((o) => o.orderId))];

    // Find other products in those orders
    const coItems = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (coItems.length === 0)
      return this.getTrending(limit, 'Frequently bought on Nexaris');

    const coProductIds = coItems
      .map((ci) => ci.productId)
      .filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: coProductIds }, status: 'PUBLISHED' },
      select: this.productSelect(),
    });

    const countMap = new Map(
      coItems.map((ci) => [ci.productId, ci._count.productId]),
    );
    const maxCount = Math.max(...coItems.map((ci) => ci._count.productId), 1);

    const results = products.map((p) =>
      this.shapeProduct(
        p as Parameters<typeof this.shapeProduct>[0],
        Math.round(((countMap.get(p.id) ?? 0) / maxCount) * 100) / 100,
        'Frequently bought together',
      ),
    );

    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── 3. Customers Also Viewed ────────────────────────────────────────────

  async getCustomersAlsoViewed(
    productId: string,
    limit = 10,
  ): Promise<RecommendedProduct[]> {
    const cacheKey = `also_viewed:${productId}:${limit}`;
    const cached = await this.getCached<RecommendedProduct[]>(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find users who viewed this product in the last 24h
    const viewers = await this.prisma.userActivity.findMany({
      where: { productId, activityType: 'VIEW', createdAt: { gte: since } },
      select: { userId: true },
    });

    const userIds = [
      ...new Set(viewers.map((v) => v.userId).filter(Boolean)),
    ] as string[];
    if (userIds.length === 0)
      return this.getTrending(limit, 'Trending on Nexaris');

    // Find other products those users viewed
    const coViews = await this.prisma.userActivity.groupBy({
      by: ['productId'],
      where: {
        userId: { in: userIds },
        activityType: 'VIEW',
        productId: { not: productId },
        createdAt: { gte: since },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (coViews.length === 0)
      return this.getTrending(limit, 'Trending on Nexaris');

    const coProductIds = coViews
      .map((cv) => cv.productId)
      .filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: coProductIds }, status: 'PUBLISHED' },
      select: this.productSelect(),
    });

    const countMap = new Map(
      coViews.map((cv) => [cv.productId, cv._count.productId]),
    );
    const maxCount = Math.max(...coViews.map((cv) => cv._count.productId), 1);

    const results = products.map((p) =>
      this.shapeProduct(
        p as Parameters<typeof this.shapeProduct>[0],
        Math.round(((countMap.get(p.id) ?? 0) / maxCount) * 100) / 100,
        'Customers also viewed this',
      ),
    );

    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── 4. Trending Products (Exponential Decay) ─────────────────────────────

  async getTrending(
    limit = 12,
    reasonOverride?: string,
  ): Promise<RecommendedProduct[]> {
    const cacheKey = `trending:${limit}`;
    const cached = await this.getCached<RecommendedProduct[]>(cacheKey);
    if (cached) {
      if (reasonOverride)
        return cached.map((p) => ({ ...p, reason: reasonOverride }));
      return cached;
    }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Activity weights
    const weights: Record<string, number> = {
      PURCHASE: 10,
      ADD_TO_CART: 5,
      WISHLIST: 3,
      VIEW: 1,
    };

    const activities = await this.prisma.userActivity.findMany({
      where: {
        productId: { not: null },
        activityType: { in: ['PURCHASE', 'ADD_TO_CART', 'WISHLIST', 'VIEW'] },
        createdAt: { gte: since },
      },
      select: { productId: true, activityType: true, createdAt: true },
    });

    // Compute decay scores
    const scoreMap = new Map<string, number>();
    const now = Date.now();

    for (const activity of activities) {
      if (!activity.productId) continue;
      const ageHours = (now - activity.createdAt.getTime()) / (1000 * 3600);
      const decayFactor = Math.exp(-DECAY_LAMBDA * ageHours);
      const weight = weights[activity.activityType] ?? 1;
      const current = scoreMap.get(activity.productId) ?? 0;
      scoreMap.set(activity.productId, current + weight * decayFactor);
    }

    const topIds = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) {
      // Fallback: recently published products
      const recent = await this.prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: this.productSelect(),
      });
      const results = recent.map((p) =>
        this.shapeProduct(
          p as Parameters<typeof this.shapeProduct>[0],
          0.5,
          'New on Nexaris',
        ),
      );
      await this.setCache(cacheKey, results);
      return results;
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: topIds }, status: 'PUBLISHED' },
      select: this.productSelect(),
    });

    const maxScore = Math.max(...topIds.map((id) => scoreMap.get(id) ?? 0), 1);

    const results = products
      .map((p) => {
        const raw = scoreMap.get(p.id) ?? 0;
        return this.shapeProduct(
          p,
          Math.round((raw / maxScore) * 100) / 100,
          reasonOverride ?? 'Trending on Nexaris',
        );
      })
      .sort((a, b) => b.score - a.score);

    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── 5. Personalized Recommendations ─────────────────────────────────────

  async getPersonalized(
    userId: string,
    limit = 12,
  ): Promise<RecommendedProduct[]> {
    const cacheKey = `personalized:${userId}:${limit}`;
    const cached = await this.getCached<RecommendedProduct[]>(cacheKey);
    if (cached) return cached;

    const profile = await this.prisma.userPreferenceProfile.findUnique({
      where: { userId },
    });

    if (!profile) return this.coldStartFallback(userId, limit);

    const categoryWeights = profile.preferredCategories as Record<
      string,
      number
    >;
    const brandWeights = profile.preferredBrands as Record<string, number>;

    const topCategoryIds = Object.entries(categoryWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    if (topCategoryIds.length === 0)
      return this.coldStartFallback(userId, limit);

    const candidates = await this.prisma.product.findMany({
      where: {
        categoryId: { in: topCategoryIds },
        status: 'PUBLISHED',
      },
      take: 100,
      select: {
        ...this.productSelect(),
        attributes: { select: { name: true, value: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const trending = await this.getTrending(50);
    const trendingScoreMap = new Map(trending.map((t) => [t.id, t.score]));

    const priceMin = Number(profile.priceRangeLow);
    const priceMax = Number(profile.priceRangeHigh);

    const scored = candidates.map((p) => {
      const catWeight = categoryWeights[p.category.id] ?? 0;
      const brandAttr = (
        p as typeof p & { attributes?: { name: string; value: string }[] }
      ).attributes?.find(
        (a: { name: string; value: string }) => a.name === 'Brand',
      );
      const brandWeight = brandAttr ? (brandWeights[brandAttr.value] ?? 0) : 0;
      const trendScore = trendingScoreMap.get(p.id) ?? 0;
      const priceScore =
        priceMin <= Number(p.price) && Number(p.price) <= priceMax ? 1 : 0.3;

      const finalScore =
        catWeight * 0.4 +
        brandWeight * 0.2 +
        trendScore * 0.2 +
        priceScore * 0.2;

      return { product: p, score: Math.round(finalScore * 100) / 100 };
    });

    scored.sort((a, b) => b.score - a.score);

    const results = scored
      .slice(0, limit)
      .map(({ product, score }) =>
        this.shapeProduct(
          product as Parameters<typeof this.shapeProduct>[0],
          score,
          `Because you viewed ${product.category.name}`,
        ),
      );

    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── Cold-Start Fallback Chain ────────────────────────────────────────────

  async coldStartFallback(
    userId: string,
    limit = 12,
  ): Promise<RecommendedProduct[]> {
    // Step 1: Category affinity from recent UserActivity
    const recentViews = await this.prisma.userActivity.findMany({
      where: {
        userId,
        activityType: { in: ['VIEW', 'ADD_TO_CART', 'WISHLIST', 'PURCHASE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        product: {
          select: { categoryId: true, category: { select: { name: true } } },
        },
      },
    });

    const categoryCount: Record<string, { count: number; name: string }> = {};
    for (const act of recentViews) {
      if (!act.product?.categoryId) continue;
      if (!categoryCount[act.product.categoryId]) {
        categoryCount[act.product.categoryId] = {
          count: 0,
          name: act.product.category?.name ?? '',
        };
      }
      categoryCount[act.product.categoryId].count++;
    }

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id, data]) => ({ id, name: data.name }));

    if (topCategories.length > 0) {
      const products = await this.prisma.product.findMany({
        where: {
          categoryId: { in: topCategories.map((c) => c.id) },
          status: 'PUBLISHED',
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.productSelect(),
      });
      if (products.length > 0) {
        return products.map((p) =>
          this.shapeProduct(
            p as Parameters<typeof this.shapeProduct>[0],
            0.7,
            `Popular in ${topCategories[0].name}`,
          ),
        );
      }
    }

    // Step 2: Trending
    const trending = await this.getTrending(limit);
    if (trending.length > 0) return trending;

    // Step 3: Best Sellers
    const bestSellers = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    if (bestSellers.length > 0) {
      const ids = bestSellers
        .map((b) => b.productId)
        .filter(Boolean) as string[];
      const products = await this.prisma.product.findMany({
        where: { id: { in: ids }, status: 'PUBLISHED' },
        select: this.productSelect(),
      });
      if (products.length > 0) {
        return products.map((p) =>
          this.shapeProduct(
            p as Parameters<typeof this.shapeProduct>[0],
            0.6,
            'Best seller on Nexaris',
          ),
        );
      }
    }

    // Step 4: New Arrivals
    const newArrivals = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: this.productSelect(),
    });

    return newArrivals.map((p) =>
      this.shapeProduct(
        p as Parameters<typeof this.shapeProduct>[0],
        0.5,
        'New on Nexaris',
      ),
    );
  }

  // ─── 6. Home Feed ─────────────────────────────────────────────────────────

  async getHomeRecommendations(
    userId: string | null,
    limit = 16,
  ): Promise<{
    personalized: RecommendedProduct[];
    trending: RecommendedProduct[];
    recentlyViewed: RecommendedProduct[];
  }> {
    const [personalized, trending, recentlyViewed] = await Promise.all([
      userId
        ? this.getPersonalized(userId, limit)
        : this.coldStartFallback('', limit),
      this.getTrending(limit),
      userId ? this.getRecentlyViewed(userId, 8) : Promise.resolve([]),
    ]);

    return { personalized, trending, recentlyViewed };
  }

  // ─── Recently Viewed ─────────────────────────────────────────────────────

  async getRecentlyViewed(
    userId: string,
    limit = 8,
  ): Promise<RecommendedProduct[]> {
    const activities = await this.prisma.userActivity.findMany({
      where: { userId, activityType: 'VIEW', productId: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: { productId: true },
      distinct: ['productId'],
    });

    const ids = activities.map((a) => a.productId).filter(Boolean) as string[];
    if (ids.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: 'PUBLISHED' },
      take: limit,
      select: this.productSelect(),
    });

    return products.map((p) =>
      this.shapeProduct(
        p as Parameters<typeof this.shapeProduct>[0],
        0.9,
        'You recently viewed this',
      ),
    );
  }

  // ─── 7. Category Recommendations ─────────────────────────────────────────

  async getCategoryRecommendations(
    userId: string | null,
    limit = 10,
  ): Promise<
    {
      categoryId: string;
      name: string;
      slug: string;
      reason: string;
      score: number;
    }[]
  > {
    const cacheKey = `category_recs:${userId ?? 'guest'}:${limit}`;
    const cached =
      await this.getCached<
        ReturnType<typeof this.getCategoryRecommendations> extends Promise<
          infer T
        >
          ? T
          : never
      >(cacheKey);
    if (cached) return cached;

    // Trending categories from activity
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activities = await this.prisma.userActivity.findMany({
      where: {
        activityType: { in: ['VIEW', 'PURCHASE', 'ADD_TO_CART', 'SEARCH'] },
        createdAt: { gte: since },
        product: { isNot: null },
      },
      select: {
        userId: true,
        activityType: true,
        createdAt: true,
        product: {
          select: {
            categoryId: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const weights: Record<string, number> = {
      PURCHASE: 10,
      ADD_TO_CART: 5,
      VIEW: 1,
      SEARCH: 2,
    };
    const categoryScore = new Map<
      string,
      { score: number; name: string; slug: string }
    >();
    const now = Date.now();

    for (const act of activities) {
      if (!act.product?.category) continue;
      const { id, name, slug } = act.product.category;
      const ageHours = (now - act.createdAt.getTime()) / 3600000;
      const decay = Math.exp(-DECAY_LAMBDA * ageHours);
      const w = weights[act.activityType] ?? 1;
      const existing = categoryScore.get(id) ?? { score: 0, name, slug };
      categoryScore.set(id, { score: existing.score + w * decay, name, slug });
    }

    // Boost based on user-specific affinity
    let userBoost: Record<string, number> = {};
    if (userId) {
      const profile = await this.prisma.userPreferenceProfile.findUnique({
        where: { userId },
      });
      if (profile)
        userBoost = profile.preferredCategories as Record<string, number>;
    }

    const maxPlatformScore = Math.max(
      ...[...categoryScore.values()].map((v) => v.score),
      1,
    );

    const results = [...categoryScore.entries()]
      .map(([id, { score, name, slug }]) => {
        const platformScore = score / maxPlatformScore;
        const userScore = userBoost[id] ?? 0;
        const finalScore = platformScore * 0.6 + userScore * 0.4;
        const reason = userBoost[id]
          ? 'Based on your interests'
          : 'Trending category';
        return {
          categoryId: id,
          name,
          slug,
          reason,
          score: Math.round(finalScore * 100) / 100,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    await this.setCache(cacheKey, results);
    return results;
  }

  // ─── 8. Seller Insights ───────────────────────────────────────────────────

  async getSellerInsights(sellerId: string): Promise<{
    marketGaps: { term: string; count: number; category: string }[];
    risingDemand: RecommendedProduct[];
  }> {
    // Market gaps: search queries with zero matching products by this seller
    const searches = await this.prisma.userActivity.findMany({
      where: { activityType: 'SEARCH' },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const termCount: Record<string, number> = {};
    for (const s of searches) {
      const meta = s.metadata as { query?: string; category?: string } | null;
      if (!meta?.query) continue;
      const key = `${meta.query}|${meta.category ?? 'all'}`;
      termCount[key] = (termCount[key] ?? 0) + 1;
    }

    const marketGaps = Object.entries(termCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [term, category] = key.split('|');
        return { term, count, category };
      });

    // Rising demand: products in seller's categories with high activity
    const sellerProducts = await this.prisma.product.findMany({
      where: { sellerId },
      select: { categoryId: true },
    });
    const categoryIds = [...new Set(sellerProducts.map((p) => p.categoryId))];

    const risingProducts = await this.prisma.product.findMany({
      where: {
        categoryId: { in: categoryIds },
        status: 'PUBLISHED',
        sellerId: { not: sellerId },
      },
      take: 20,
      select: this.productSelect(),
    });

    const risingDemand = risingProducts.map((p) =>
      this.shapeProduct(
        p as Parameters<typeof this.shapeProduct>[0],
        0.7,
        'High platform demand in your category',
      ),
    );

    return { marketGaps, risingDemand };
  }

  // ─── 9. Debug Info ────────────────────────────────────────────────────────

  async getDebugInfo(): Promise<{
    cacheEntries: number;
    similarityRecords: number;
    preferenceProfiles: number;
    recentEvents: number;
    redisStatus: string;
  }> {
    const [cacheEntries, similarityRecords, preferenceProfiles, recentEvents] =
      await Promise.all([
        this.prisma.recommendationCache.count(),
        this.prisma.productSimilarity.count(),
        this.prisma.userPreferenceProfile.count(),
        this.prisma.recommendationEvent.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    let redisStatus = 'unknown';
    try {
      await this.redis.set('healthcheck', '1', 5);
      redisStatus = 'connected';
    } catch {
      redisStatus = 'unavailable';
    }

    return {
      cacheEntries,
      similarityRecords,
      preferenceProfiles,
      recentEvents,
      redisStatus,
    };
  }

  // ─── 10. Log Recommendation Event ─────────────────────────────────────────

  async logEvent(dto: {
    userId?: string;
    recommendationType: string;
    productId: string;
    interaction: string;
  }): Promise<void> {
    await this.prisma.recommendationEvent.create({
      data: {
        userId: dto.userId,
        recommendationType: dto.recommendationType,
        productId: dto.productId,
        interaction: dto.interaction,
      },
    });
  }

  // ─── Update User Preference Profile ──────────────────────────────────────

  async updateUserPreferenceProfile(userId: string): Promise<void> {
    const activities = await this.prisma.userActivity.findMany({
      where: {
        userId,
        activityType: { in: ['VIEW', 'ADD_TO_CART', 'PURCHASE', 'WISHLIST'] },
        productId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        product: {
          select: {
            categoryId: true,
            category: { select: { name: true } },
            attributes: { select: { name: true, value: true } },
            price: true,
          },
        },
      },
    });

    const weights: Record<string, number> = {
      PURCHASE: 10,
      ADD_TO_CART: 5,
      WISHLIST: 3,
      VIEW: 1,
    };
    const categoryWeights: Record<string, number> = {};
    const brandWeights: Record<string, number> = {};
    const prices: number[] = [];
    const now = Date.now();

    for (const act of activities) {
      if (!act.product) continue;
      const ageHours = (now - act.createdAt.getTime()) / 3600000;
      const decay = Math.exp(-DECAY_LAMBDA * ageHours);
      const w = (weights[act.activityType] ?? 1) * decay;

      categoryWeights[act.product.categoryId] =
        (categoryWeights[act.product.categoryId] ?? 0) + w;

      const brand = act.product.attributes.find(
        (a: { name: string; value: string }) => a.name === 'Brand',
      );
      if (brand)
        brandWeights[brand.value] = (brandWeights[brand.value] ?? 0) + w;

      prices.push(Number(act.product.price));
    }

    const priceRangeLow = prices.length > 0 ? Math.min(...prices) * 0.8 : 0;
    const priceRangeHigh =
      prices.length > 0 ? Math.max(...prices) * 1.2 : 100000;

    await this.prisma.userPreferenceProfile.upsert({
      where: { userId },
      create: {
        userId,
        preferredCategories: categoryWeights as never,
        preferredBrands: brandWeights as never,
        priceRangeLow,
        priceRangeHigh,
      },
      update: {
        preferredCategories: categoryWeights as never,
        preferredBrands: brandWeights as never,
        priceRangeLow,
        priceRangeHigh,
      },
    });
  }
}
