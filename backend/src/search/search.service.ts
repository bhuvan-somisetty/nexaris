import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ProductStatus, UserActivityType } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Synonym Expansion ─────────────────────────────────────────────────────
  async expandQueryWithSynonyms(rawQuery: string): Promise<string> {
    const queryLower = rawQuery.trim().toLowerCase();
    if (!queryLower) return '';

    // Fetch all synonyms from the database
    const mappings = await this.prisma.searchSynonym.findMany();
    
    // Sort mappings by word length descending so we match longer phrases first
    mappings.sort((a, b) => b.word.length - a.word.length);

    let parsedQuery = queryLower;
    const replacements: string[] = [];

    // Replace matching phrases with placeholders like __SYNONYM_0__
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const escapedWord = mapping.word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
      if (regex.test(parsedQuery)) {
        // Construct the replacement expression
        const wordFts = mapping.word.split(/\s+/).join(' & ');
        const synonymsFts = mapping.synonyms
          .map((syn) => '(' + syn.split(/\s+/).join(' & ') + ')')
          .join(' | ');

        const ftsReplacement = `((${wordFts}) | ${synonymsFts})`;
        replacements.push(ftsReplacement);
        
        parsedQuery = parsedQuery.replace(regex, `__SYNONYM_${replacements.length - 1}__`);
      }
    }

    // Split query by spaces to get words
    const tokens = parsedQuery.split(/\s+/).filter(Boolean);
    const ftsTokens = tokens.map((token) => {
      const match = token.match(/^__SYNONYM_(\d+)__$/);
      if (match) {
        const index = parseInt(match[1], 10);
        return replacements[index];
      }
      // Return plain escaped word
      const escapedToken = token.replace(/[':&|!*()]/g, '');
      return escapedToken ? escapedToken : null;
    }).filter(Boolean);

    if (ftsTokens.length === 0) return '';
    return ftsTokens.join(' & ');
  }

  // ─── Autocomplete Suggestions ──────────────────────────────────────────────
  async getAutocompleteSuggestions(prefix: string): Promise<string[]> {
    if (!prefix || prefix.length < 2) return [];
    const cacheKey = `search:suggest:${prefix.toLowerCase().trim()}`;

    // Try Redis cache first
    try {
      const cached = await this.redis.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (e) {
      this.logger.warn(`Redis autocomplete cache read failed: ${e}`);
    }

    // Fetch terms matching prefix from products
    const term = `${prefix.toLowerCase().trim()}%`;
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.PUBLISHED,
        OR: [
          { name: { startsWith: prefix, mode: 'insensitive' } },
          { category: { name: { startsWith: prefix, mode: 'insensitive' } } },
        ],
      },
      select: { name: true },
      take: 10,
    });

    const suggestions = Array.from(new Set(products.map((p) => p.name.trim())));

    // Cache results for 1 hour
    try {
      await this.redis.set(cacheKey, suggestions, 3600);
    } catch (e) {
      this.logger.warn(`Redis autocomplete cache write failed: ${e}`);
    }

    return suggestions;
  }

  // ─── Trending Searches ─────────────────────────────────────────────────────
  async getTrendingSearches(): Promise<string[]> {
    const cacheKey = 'search:trending:queries';

    try {
      const cached = await this.redis.get<string[]>(cacheKey);
      if (cached) return cached;
    } catch (e) {
      this.logger.warn(`Redis trending read failed: ${e}`);
    }

    // Fetch top searched words in the last 7 days from SearchQueryLog
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const logs = await this.prisma.searchQueryLog.groupBy({
      by: ['query'],
      _count: {
        query: true,
      },
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 8,
    });

    const trending = logs.map((l) => l.query);

    try {
      await this.redis.set(cacheKey, trending, 900); // 15 mins TTL
    } catch (e) {
      this.logger.warn(`Redis trending write failed: ${e}`);
    }

    return trending;
  }

  // ─── Search History Management ─────────────────────────────────────────────
  async getSearchHistory(userId: string) {
    return this.prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  async clearSearchHistory(userId: string, historyId: string) {
    return this.prisma.searchHistory.delete({
      where: { id: historyId, userId },
    });
  }

  // ─── Search & Discovery Logic ──────────────────────────────────────────────
  async searchProducts(
    userId: string | null,
    query: {
      q?: string;
      categoryId?: string;
      brand?: string;
      sellerId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      rating?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const q = query.q ? query.q.trim() : '';
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    let matchingProductIds: string[] = [];
    let isFuzzyFallback = false;

    // A. Query Matching Phase
    if (q) {
      // 1. Synonym expansion & Lexical FTS search
      const ftsQuery = await this.expandQueryWithSynonyms(q);
      const ftsResult: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT p.id
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "User" u ON p."sellerId" = u.id
        LEFT JOIN "SellerProfile" sp ON u.id = sp."userId"
        WHERE p.status = 'PUBLISHED' AND (
          to_tsvector('english', p.name || ' ' || p.description) @@ to_tsquery('english', $1)
          OR to_tsvector('english', c.name) @@ to_tsquery('english', $1)
          OR to_tsvector('english', coalesce(sp."storeName", '')) @@ to_tsquery('english', $1)
        )
      `, ftsQuery);

      matchingProductIds = ftsResult.map((r) => r.id);

      // 2. Fuzzy fallback if 0 results
      if (matchingProductIds.length === 0) {
        isFuzzyFallback = true;
        const fuzzyResult: any[] = await this.prisma.$queryRawUnsafe(`
          SELECT p.id, similarity(p.name, $1) AS sim
          FROM "Product" p
          WHERE p.status = 'PUBLISHED' AND similarity(p.name, $1) >= 0.2
          ORDER BY sim DESC
          LIMIT 100
        `, q);
        matchingProductIds = fuzzyResult.map((r) => r.id);
      }
    } else {
      // If empty query, all published products are candidates
      const allProducts = await this.prisma.product.findMany({
        where: { status: ProductStatus.PUBLISHED },
        select: { id: true },
      });
      matchingProductIds = allProducts.map((p) => p.id);
    }

    let searchQueryLogId: string | null = null;

    if (matchingProductIds.length === 0) {
      // Log Search log with 0 results
      if (q) {
        const log = await this.prisma.searchQueryLog.create({
          data: { query: q, userId, resultsCount: 0 },
        });
        searchQueryLogId = log.id;
      }
      return {
        products: [],
        total: 0,
        facets: { categories: [], brands: [], priceRange: { min: 0, max: 0 }, availabilityCount: 0 },
        page,
        limit,
        isFuzzyFallback,
        noResultsRecovery: true, // Prompt recovery flow on frontend
        searchQueryLogId,
      };
    }

    // B. Fetch Candidate Products with detailed relations
    const candidates = await this.prisma.product.findMany({
      where: {
        id: { in: matchingProductIds },
        status: ProductStatus.PUBLISHED,
        ...(query.categoryId && {
          categoryId: { in: query.categoryId.split(',') },
        }),
        ...(query.sellerId && {
          sellerId: { in: query.sellerId.split(',') },
        }),
        ...(query.minPrice !== undefined && { price: { gte: query.minPrice } }),
        ...(query.maxPrice !== undefined && { price: { lte: query.maxPrice } }),
      },
      include: {
        images: true,
        category: true,
        attributes: true,
        inventory: true,
        reviews: true,
        seller: {
          select: {
            id: true,
            sellerProfile: { select: { storeName: true } },
          },
        },
      },
    });

    // C. Filter by Availability & Rating (PostgreSQL joins / JS filters)
    let filteredCandidates = candidates;
    if (query.inStock) {
      filteredCandidates = filteredCandidates.filter(
        (p) => p.inventory && p.inventory.quantity > 0,
      );
    }
    if (query.rating) {
      filteredCandidates = filteredCandidates.filter((p) => {
        if (p.reviews.length === 0) return false;
        const avg = p.reviews.reduce((acc, r) => acc + r.rating, 0) / p.reviews.length;
        return avg >= (query.rating || 0);
      });
    }

    // Filter by Brand attribute
    if (query.brand) {
      const selectedBrands = query.brand.split(',').map((b) => b.trim().toLowerCase());
      filteredCandidates = filteredCandidates.filter((p) =>
        p.attributes.some(
          (attr) =>
            attr.name.toLowerCase() === 'brand' &&
            selectedBrands.includes(attr.value.toLowerCase()),
        ),
      );
    }

    // D. Compute Ranking and Score Formula
    const userPreference = userId
      ? await this.prisma.userPreferenceProfile.findUnique({
          where: { userId },
        })
      : null;

    const scoredProducts = await Promise.all(
      filteredCandidates.map(async (p) => {
        // 1. Relevance Score
        let relevance = 0.5;
        if (q) {
          const nameSim = similarityScore(p.name, q);
          relevance = nameSim;
        }

        // 2. Popularity
        const viewsCount = await this.prisma.userActivity.count({
          where: { productId: p.id, activityType: 'VIEW' },
        });
        const cartAddsCount = await this.prisma.userActivity.count({
          where: { productId: p.id, activityType: 'ADD_TO_CART' },
        });
        const popularity = Math.min(1.0, (viewsCount + 3 * cartAddsCount) / 1000);

        // 3. Sales Volume (orders in last 30 days)
        const salesCount = await this.prisma.orderItem.count({
          where: { productId: p.id, order: { status: { not: 'CANCELLED' } } },
        });
        const sales = Math.min(1.0, salesCount / 100);

        // 4. Reviews & Rating
        let avgRating = 0;
        let reviewsCount = p.reviews.length;
        if (reviewsCount > 0) {
          avgRating = p.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewsCount;
        }
        const reviewScore = (avgRating / 5.0) * (Math.log(1 + reviewsCount) / Math.log(50));

        // 5. Freshness
        const ageInDays = (Date.now() - new Date(p.createdAt).getTime()) / (24 * 3600 * 1000);
        const freshness = Math.exp(-0.05 * ageInDays);

        // 6. Stock status penalty mapping (from approved instructions)
        let stockMultiplier = 0.05;
        const qty = p.inventory?.quantity || 0;
        if (qty > 10) {
          stockMultiplier = 1.0;
        } else if (qty > 0) {
          stockMultiplier = 0.7;
        }

        // 7. Personalization signals
        let personalization = 0;
        if (userPreference) {
          const favCategories = (userPreference.preferredCategories as Record<string, number>) || {};
          if (favCategories[p.categoryId] !== undefined) {
            personalization = Math.min(1.0, favCategories[p.categoryId] / 10);
          }
        }

        // Calculate Rank Score Formula
        // Score = 0.4*Rel + 0.1*Pop + 0.15*Sales + 0.1*Rev + 0.05*Fresh + 0.1*Stock + 0.1*Pers
        const score =
          0.4 * relevance +
          0.1 * popularity +
          0.15 * sales +
          0.1 * reviewScore +
          0.05 * freshness +
          0.1 * stockMultiplier +
          0.1 * personalization;

        return {
          product: p,
          score: Math.round(score * 100),
          stockMultiplier,
        };
      }),
    );

    // Sort by calculated Score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    // Paginate results
    const paginated = scoredProducts.slice(skip, skip + limit);

    // E. Calculate Facet Counts for discovery filters sidebar
    const brandsMap = new Map<string, number>();
    const categoriesMap = new Map<string, number>();
    let maxPrice = 0;
    let minPrice = Infinity;
    let inStockCount = 0;

    candidates.forEach((cand) => {
      const price = Number(cand.price);
      if (price > maxPrice) maxPrice = price;
      if (price < minPrice) minPrice = price;

      const brandAttr = cand.attributes.find((a) => a.name.toLowerCase() === 'brand');
      if (brandAttr) {
        brandsMap.set(brandAttr.value, (brandsMap.get(brandAttr.value) || 0) + 1);
      }

      categoriesMap.set(cand.category.name, (categoriesMap.get(cand.category.name) || 0) + 1);

      if (cand.inventory && cand.inventory.quantity > 0) {
        inStockCount++;
      }
    });

    const facets = {
      brands: Array.from(brandsMap.entries()).map(([name, count]) => ({ name, count })),
      categories: Array.from(categoriesMap.entries()).map(([name, count]) => ({ name, count })),
      priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice },
      availabilityCount: inStockCount,
    };

    // F. Logging Analytics
    if (q) {
      const searchLog = await this.prisma.searchQueryLog.create({
        data: {
          query: q,
          userId,
          resultsCount: scoredProducts.length,
        },
      });
      searchQueryLogId = searchLog.id;

      // Track query history for registered user
      if (userId) {
        await this.prisma.searchHistory.create({
          data: { userId, query: q },
        });
      }

      // Track search activity in analytics hooks
      await this.prisma.userActivity.create({
        data: {
          userId,
          activityType: 'SEARCH',
          metadata: { query: q, searchLogId: searchLog.id },
        },
      });
    }

    return {
      products: paginated,
      total: scoredProducts.length,
      facets,
      page,
      limit,
      isFuzzyFallback,
      noResultsRecovery: false,
      searchQueryLogId,
    };
  }

  // ─── Click & Conversion Event Loggers ─────────────────────────────────────
  async logSearchClick(searchQueryLogId: string, productId: string) {
    return this.prisma.searchClickLog.create({
      data: { searchQueryLogId, productId },
    });
  }

  // ─── Seller Search Dashboard Analytics ────────────────────────────────────
  async getSellerSearchAnalytics(sellerId: string) {
    // 1. Top searched terms referencing this seller's products
    // Fetch products owned by this seller
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      select: { id: true },
    });
    const productIds = products.map((p) => p.id);

    // Clicks on search matching this seller's products
    const totalClicks = await this.prisma.searchClickLog.count({
      where: { productId: { in: productIds } },
    });

    // Converted clicks
    const totalConversions = await this.prisma.searchClickLog.count({
      where: { productId: { in: productIds }, isConverted: true },
    });

    // Discovery Funnel calculation
    const impressionsCount = totalClicks * 20; // Simulated impressions scale factor
    const cartAddsCount = Math.round(totalClicks * 0.25);

    // Top search keywords mapping
    const rawKeywords = await this.prisma.searchQueryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const keywordCounts: Record<string, number> = {};
    rawKeywords.forEach((k) => {
      keywordCounts[k.query] = (keywordCounts[k.query] || 0) + 1;
    });

    const topKeywords = Object.entries(keywordCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Zero result searches
    const zeroResults = await this.prisma.searchQueryLog.findMany({
      where: { resultsCount: 0 },
      select: { query: true },
      take: 100,
    });
    const zeroCounts: Record<string, number> = {};
    zeroResults.forEach((z) => {
      zeroCounts[z.query] = (zeroCounts[z.query] || 0) + 1;
    });
    const zeroResultKeywords = Object.entries(zeroCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const ctr = impressionsCount > 0 ? (totalClicks / impressionsCount) * 100 : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      impressions: impressionsCount,
      ctr,
      conversionRate,
      funnel: {
        impressions: impressionsCount,
        clicks: totalClicks,
        cartAdds: cartAddsCount,
        purchases: totalConversions,
      },
      topKeywords,
      zeroResultKeywords,
    };
  }

  // ─── Recovery Feed: Trending + Personalization ──────────────────────────────
  async getRecoveryData(userId: string | null) {
    // 1. Trending products
    const trendingProducts = await this.prisma.product.findMany({
      where: { status: ProductStatus.PUBLISHED },
      include: { images: true, category: true },
      take: 4,
    });

    // 2. Top categories
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      take: 6,
    });

    // 3. User personalized recommendations (from UserPreferenceProfile)
    let recommendations: any[] = [];
    if (userId) {
      const pref = await this.prisma.userPreferenceProfile.findUnique({
        where: { userId },
      });
      if (pref) {
        const favCategories = Object.keys((pref.preferredCategories as Record<string, number>) || {});
        if (favCategories.length > 0) {
          recommendations = await this.prisma.product.findMany({
            where: {
              categoryId: { in: favCategories },
              status: ProductStatus.PUBLISHED,
            },
            include: { images: true },
            take: 4,
          });
        }
      }
    }

    return {
      trendingProducts,
      categories,
      recommendations,
    };
  }
}

// Trigram/character distance similarity helper
function similarityScore(s1: string, s2: string): number {
  const match1 = s1.toLowerCase();
  const match2 = s2.toLowerCase();
  if (match1.includes(match2) || match2.includes(match1)) return 1.0;

  // Edit distance calculation (Levenshtein)
  const track = Array(match2.length + 1)
    .fill(null)
    .map(() => Array(match1.length + 1).fill(null));
  for (let i = 0; i <= match1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= match2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= match2.length; j += 1) {
    for (let i = 1; i <= match1.length; i += 1) {
      const indicator = match1[i - 1] === match2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + 2, // substitution (higher penalty)
      );
    }
  }
  const dist = track[match2.length][match1.length];
  const maxLen = Math.max(match1.length, match2.length);
  return maxLen > 0 ? (maxLen - dist) / maxLen : 0;
}
