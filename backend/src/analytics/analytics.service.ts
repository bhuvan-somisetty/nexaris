import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // Helper to generate cache keys
  private getCacheKey(sellerId: string, namespace: string, startDate?: string, endDate?: string): string {
    return `analytics:${sellerId}:${namespace}:${startDate || 'all'}:${endDate || 'all'}`;
  }

  // Record a product view
  async recordProductView(productId: string): Promise<void> {
    try {
      await this.prisma.productView.create({
        data: { productId },
      });
    } catch (err: any) {
      this.logger.error(`Failed to log product view for ${productId}: ${err.message}`);
    }
  }

  // ─── Seller Analytics Dashboard Overview ───
  async getDashboardSummary(sellerId: string, startDateStr?: string, endDateStr?: string) {
    const cacheKey = this.getCacheKey(sellerId, 'dashboard', startDateStr, endDateStr);
    const cachedData = await this.redis.get<any>(cacheKey);
    if (cachedData) return cachedData;

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // 1. Revenue calculations using database-level raw queries for 100k+ scalability
    const getRevenueForRange = async (start: Date, end: Date) => {
      const res: any = await this.prisma.$queryRaw`
        SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE oi."sellerId" = ${sellerId}
          AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
          AND o."createdAt" >= ${start}
          AND o."createdAt" <= ${end}
      `;
      return Number(res[0]?.revenue || 0);
    };

    const revenueToday = await getRevenueForRange(todayStart, now);
    const revenueThisWeek = await getRevenueForRange(weekStart, now);
    const revenueThisMonth = await getRevenueForRange(monthStart, now);
    const revenueThisYear = await getRevenueForRange(yearStart, now);

    // 2. Custom date-range aggregation (total revenue & order counts)
    const customAgg: any = await this.prisma.$queryRaw`
      SELECT 
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
        COUNT(DISTINCT oi."orderId") as "ordersCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
    `;

    const rangeRevenue = Number(customAgg[0]?.revenue || 0);
    const ordersCount = Number(customAgg[0]?.ordersCount || 0);
    const averageOrderValue = ordersCount > 0 ? Number((rangeRevenue / ordersCount).toFixed(2)) : 0;

    // 3. Refund Rate
    const refundsQuery: any = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT oi."orderId") as "refundedCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status = 'REFUNDED'
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
    `;
    const refundedCount = Number(refundsQuery[0]?.refundedCount || 0);
    const totalOrdersCountAll: any = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT oi."orderId") as "totalCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
    `;
    const totalOrdersCount = Number(totalOrdersCountAll[0]?.totalCount || 0);
    const refundRate = totalOrdersCount > 0 ? Number(((refundedCount / totalOrdersCount) * 100).toFixed(2)) : 0;

    // 4. Conversion Rate (Orders / Views)
    const viewsQuery: any = await this.prisma.$queryRaw`
      SELECT COUNT(pv.id) as "viewsCount"
      FROM "ProductView" pv
      INNER JOIN "Product" p ON pv."productId" = p.id
      WHERE p."sellerId" = ${sellerId}
        AND pv."createdAt" >= ${startDate}
        AND pv."createdAt" <= ${endDate}
    `;
    const totalViews = Number(viewsQuery[0]?.viewsCount || 0);
    const conversionRate = totalViews > 0 ? Number(((ordersCount / totalViews) * 100).toFixed(2)) : 0;

    const data = {
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        thisYear: revenueThisYear,
        rangeTotal: rangeRevenue,
      },
      ordersCount,
      averageOrderValue,
      refundRate,
      conversionRate,
      totalViews,
    };

    // Cache the result for 15 minutes
    await this.redis.set(cacheKey, data, 900);
    return data;
  }

  // ─── Product Analytics ───
  async getProductAnalytics(sellerId: string, startDateStr?: string, endDateStr?: string) {
    const cacheKey = this.getCacheKey(sellerId, 'products', startDateStr, endDateStr);
    const cachedData = await this.redis.get<any>(cacheKey);
    if (cachedData) return cachedData;

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // 1. Top Selling Products
    const topSelling: any[] = await this.prisma.$queryRaw`
      SELECT 
        oi."productId" as id,
        oi."productName" as name,
        SUM(oi.quantity) as quantity,
        SUM(oi.price * oi.quantity) as revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY oi."productId", oi."productName"
      ORDER BY revenue DESC
      LIMIT 10
    `;

    // 2. Lowest Performing Products
    const lowestPerforming: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        COALESCE(SUM(oi.quantity), 0) as quantity,
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM "Product" p
      LEFT JOIN "OrderItem" oi ON p.id = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o.id AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED') AND o."createdAt" >= ${startDate} AND o."createdAt" <= ${endDate}
      WHERE p."sellerId" = ${sellerId}
      GROUP BY p.id, p.name
      ORDER BY revenue ASC, quantity ASC
      LIMIT 10
    `;

    // 3. Most Viewed Products
    const mostViewed: any[] = await this.prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        COUNT(pv.id) as views
      FROM "Product" p
      LEFT JOIN "ProductView" pv ON p.id = pv."productId" AND pv."createdAt" >= ${startDate} AND pv."createdAt" <= ${endDate}
      WHERE p."sellerId" = ${sellerId}
      GROUP BY p.id, p.name
      ORDER BY views DESC
      LIMIT 10
    `;

    // 4. Inventory Health Metrics
    // Low stock count items below custom thresholds or default (5)
    const lowStockThreshold = 5;
    const inventoryItems = await this.prisma.inventory.findMany({
      where: {
        OR: [
          { product: { sellerId } },
          { variant: { product: { sellerId } } },
        ],
      },
      include: {
        product: true,
        variant: {
          include: { product: true },
        },
      },
    });

    let totalStockValue = 0;
    const lowStockAlerts: any[] = [];
    const outOfStockAlerts: any[] = [];

    for (const inv of inventoryItems) {
      const quantity = inv.quantity;
      const threshold = inv.lowStockThreshold || lowStockThreshold;
      const productPrice = Number(inv.product?.price || inv.variant?.price || inv.variant?.product?.price || 0);
      
      totalStockValue += quantity * productPrice;

      const itemName = inv.product ? inv.product.name : `${inv.variant?.product?.name} (${inv.variant?.name})`;
      const itemId = inv.product ? inv.product.id : inv.variant?.productId;
      const sku = inv.product ? inv.product.sku : inv.variant?.sku;

      if (quantity === 0) {
        outOfStockAlerts.push({ id: itemId, name: itemName, sku, stock: 0 });
      } else if (quantity <= threshold) {
        lowStockAlerts.push({ id: itemId, name: itemName, sku, stock: quantity, threshold });
      }
    }

    const data = {
      topSelling: topSelling.map(p => ({ ...p, quantity: Number(p.quantity), revenue: Number(p.revenue) })),
      lowestPerforming: lowestPerforming.map(p => ({ ...p, quantity: Number(p.quantity), revenue: Number(p.revenue) })),
      mostViewed: mostViewed.map(p => ({ ...p, views: Number(p.views) })),
      inventoryHealth: {
        totalStockValue,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount: outOfStockAlerts.length,
      },
      alerts: {
        lowStock: lowStockAlerts,
        outOfStock: outOfStockAlerts,
      },
    };

    await this.redis.set(cacheKey, data, 900);
    return data;
  }

  // ─── Customer Analytics ───
  async getCustomerAnalytics(sellerId: string, startDateStr?: string, endDateStr?: string) {
    const cacheKey = this.getCacheKey(sellerId, 'customers', startDateStr, endDateStr);
    const cachedData = await this.redis.get<any>(cacheKey);
    if (cachedData) return cachedData;

    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // 1. Fetch all orders containing this seller's products to map customer trends
    const ordersRaw: any[] = await this.prisma.$queryRaw`
      SELECT 
        o."customerId",
        o.id as "orderId",
        o."createdAt",
        oi.price * oi.quantity as item_total
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
      ORDER BY o."createdAt" ASC
    `;

    // Map customers to their first purchase date
    const customerFirstPurchase = new Map<string, Date>();
    const customerOrderCounts = new Map<string, number>();
    const customerLifetimesTotal = new Map<string, number>();

    for (const ord of ordersRaw) {
      const cid = ord.customerId;
      const date = new Date(ord.createdAt);
      const total = Number(ord.item_total);

      if (!customerFirstPurchase.has(cid)) {
        customerFirstPurchase.set(cid, date);
      }
      customerOrderCounts.set(cid, (customerOrderCounts.get(cid) || 0) + 1);
      customerLifetimesTotal.set(cid, (customerLifetimesTotal.get(cid) || 0) + total);
    }

    // Classify customers inside the target date range
    let newCustomers = 0;
    let returningCustomers = 0;
    const uniqueCustomersInRange = new Set<string>();

    for (const ord of ordersRaw) {
      const date = new Date(ord.createdAt);
      if (date >= startDate && date <= endDate) {
        const cid = ord.customerId;
        uniqueCustomersInRange.add(cid);
      }
    }

    for (const cid of uniqueCustomersInRange) {
      const firstPurchase = customerFirstPurchase.get(cid);
      if (firstPurchase && firstPurchase >= startDate && firstPurchase <= endDate) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    }

    // 2. Repeat Purchase Rate (Customers with > 1 order / Total customers)
    let repeatCustomers = 0;
    for (const count of customerOrderCounts.values()) {
      if (count > 1) repeatCustomers++;
    }
    const totalCustomersCount = customerOrderCounts.size;
    const repeatPurchaseRate = totalCustomersCount > 0 ? Number(((repeatCustomers / totalCustomersCount) * 100).toFixed(2)) : 0;

    // 3. Customer Lifetime Value (CLV)
    let totalLifetimeRevenue = 0;
    for (const value of customerLifetimesTotal.values()) {
      totalLifetimeRevenue += value;
    }
    const customerLifetimeValue = totalCustomersCount > 0 ? Number((totalLifetimeRevenue / totalCustomersCount).toFixed(2)) : 0;

    // 4. Customer Retention Rate (approx calculation from order logs over previous 60-day cohort)
    const prevCohortStart = new Date(startDate.getTime() - 60 * 24 * 60 * 60 * 1000);
    const prevCohortEnd = startDate;
    const activeInPrevCohort = new Set<string>();
    const retainedInCurrent = new Set<string>();

    for (const ord of ordersRaw) {
      const date = new Date(ord.createdAt);
      const cid = ord.customerId;
      if (date >= prevCohortStart && date < prevCohortEnd) {
        activeInPrevCohort.add(cid);
      }
      if (date >= startDate && date <= endDate) {
        if (activeInPrevCohort.has(cid)) {
          retainedInCurrent.add(cid);
        }
      }
    }
    const retentionRate = activeInPrevCohort.size > 0 
      ? Number(((retainedInCurrent.size / activeInPrevCohort.size) * 100).toFixed(2)) 
      : 100.0; // Fallback to 100% if no historical cohort is active

    const data = {
      newCustomers,
      returningCustomers,
      retentionRate,
      repeatPurchaseRate,
      customerLifetimeValue,
      totalCustomers: totalCustomersCount,
    };

    await this.redis.set(cacheKey, data, 900);
    return data;
  }

  // ─── Real-Time Analytics Widgets (Auto-Refresh Every 30s) ───
  async getRealTimeAnalytics(sellerId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Live Revenue Today
    const revTodayRes: any = await this.prisma.$queryRaw`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
        AND o."createdAt" >= ${todayStart}
    `;
    const liveRevenueToday = Number(revTodayRes[0]?.revenue || 0);

    // 2. Live Orders Today
    const ordTodayRes: any = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT oi."orderId") as "ordersCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
        AND o."createdAt" >= ${todayStart}
    `;
    const liveOrdersToday = Number(ordTodayRes[0]?.ordersCount || 0);

    // 3. Products Viewed Last Hour
    const viewsLastHourRes: any = await this.prisma.$queryRaw`
      SELECT COUNT(pv.id) as "viewsCount"
      FROM "ProductView" pv
      INNER JOIN "Product" p ON pv."productId" = p.id
      WHERE p."sellerId" = ${sellerId}
        AND pv."createdAt" >= ${lastHour}
    `;
    const productsViewedLastHour = Number(viewsLastHourRes[0]?.viewsCount || 0);

    // 4. Active Customers (Last 24h)
    const activeCustomersRes: any = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT o."customerId") as "custCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o."createdAt" >= ${last24h}
    `;
    const activeCustomers = Number(activeCustomersRes[0]?.custCount || 0);

    return {
      liveRevenueToday,
      liveOrdersToday,
      productsViewedLastHour,
      activeCustomers,
      lastUpdated: now.toISOString(),
    };
  }

  // ─── Business Health Score ───
  async getBusinessHealthScore(sellerId: string) {
    const summary = await this.getDashboardSummary(sellerId);
    const customers = await this.getCustomerAnalytics(sellerId);
    const products = await this.getProductAnalytics(sellerId);

    // 1. Revenue Growth Score (30%)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const getRevenue = async (start: Date, end: Date) => {
      const res: any = await this.prisma.$queryRaw`
        SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON oi."orderId" = o.id
        WHERE oi."sellerId" = ${sellerId}
          AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
          AND o."createdAt" >= ${start}
          AND o."createdAt" <= ${end}
      `;
      return Number(res[0]?.revenue || 0);
    };

    const currentMonthRevenue = await getRevenue(currentMonthStart, now);
    const lastMonthRevenue = await getRevenue(lastMonthStart, lastMonthEnd);

    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (currentMonthRevenue > 0) {
      revenueGrowth = 100; // default 100% score if starting new
    }
    const growthScore = Math.min(100, Math.max(0, 50 + revenueGrowth)); // Map growth metrics around 50

    // 2. Order Completion Rate (20%)
    // completionRate = delivered + shipped + processing / total non-failed orders
    const completionRes: any = await this.prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT CASE WHEN o.status IN ('DELIVERED', 'SHIPPED', 'CONFIRMED', 'PROCESSING') THEN oi."orderId" END) as "completedCount",
        COUNT(DISTINCT oi."orderId") as "totalCount"
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status != 'PAYMENT_FAILED'
    `;
    const completedCount = Number(completionRes[0]?.completedCount || 0);
    const totalCount = Number(completionRes[0]?.totalCount || 0);
    const completionScore = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;

    // 3. Refund Rate Penalty (15%)
    const refundScore = Math.max(0, 100 - (summary.refundRate * 5)); // Penalize high refunds heavily

    // 4. Customer Rating Score (15%)
    const ratingRes = await this.prisma.sellerRating.aggregate({
      where: { sellerId },
      _avg: { rating: true },
    });
    const avgRating = ratingRes._avg.rating || 5.0; // Default to 5 if no ratings exist
    const ratingScore = (avgRating / 5.0) * 100;

    // 5. Inventory Health Score (20%)
    const totalProducts = await this.prisma.product.count({ where: { sellerId } });
    const unhealthyProducts = products.inventoryHealth.lowStockCount + products.inventoryHealth.outOfStockCount;
    const inventoryScore = totalProducts > 0 
      ? ((totalProducts - unhealthyProducts) / totalProducts) * 100 
      : 100;

    // Weighted average
    const finalScore = Math.round(
      (growthScore * 0.30) +
      (completionScore * 0.20) +
      (refundScore * 0.15) +
      (ratingScore * 0.15) +
      (inventoryScore * 0.20)
    );

    let category: 'Excellent' | 'Good' | 'Needs Attention' = 'Needs Attention';
    if (finalScore >= 90) category = 'Excellent';
    else if (finalScore >= 75) category = 'Good';

    return {
      score: finalScore,
      category,
      breakdown: {
        revenueGrowthScore: Math.round(growthScore),
        orderCompletionScore: Math.round(completionScore),
        refundPenaltyScore: Math.round(refundScore),
        customerRatingScore: Math.round(ratingScore),
        inventoryHealthScore: Math.round(inventoryScore),
      },
    };
  }

  // ─── Trend Visualization Trends (Charts) ───
  async getTrendsData(sellerId: string, startDateStr?: string, endDateStr?: string) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // 1. Fetch daily details via native raw SQL to scale efficiently
    const dailyStats: any[] = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', o."createdAt") as day,
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
        COUNT(DISTINCT oi."orderId") as orders,
        COUNT(DISTINCT o."customerId") as growth
      FROM "OrderItem" oi
      INNER JOIN "Order" o ON oi."orderId" = o.id
      WHERE oi."sellerId" = ${sellerId}
        AND o.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
        AND o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', o."createdAt")
      ORDER BY day ASC
    `;

    // Fill missing dates in trend charts
    const result = {
      timeline: [] as string[],
      revenueTrend: [] as number[],
      ordersTrend: [] as number[],
      customerGrowthTrend: [] as number[],
    };

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const match = dailyStats.find(d => {
        const dStr = new Date(d.day).toISOString().split('T')[0];
        return dStr === dateStr;
      });

      result.timeline.push(dateStr);
      result.revenueTrend.push(match ? Number(match.revenue) : 0);
      result.ordersTrend.push(match ? Number(match.orders) : 0);
      result.customerGrowthTrend.push(match ? Number(match.growth) : 0);

      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  // ─── Forecasting Widgets (7 & 30 Days Projections) ───
  async getForecasting(sellerId: string) {
    const trends = await this.getTrendsData(sellerId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), new Date().toISOString());
    
    // Fit a simple linear regression line: y = mx + c
    const linearForecast = (data: number[], daysOut: number) => {
      const n = data.length;
      if (n === 0) return Array(daysOut).fill(0);
      if (n === 1) return Array(daysOut).fill(data[0]);

      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
      }

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const predictions: number[] = [];
      for (let i = 1; i <= daysOut; i++) {
        const pred = Math.max(0, slope * (n - 1 + i) + intercept); // Floor to 0 to prevent negative predictions
        predictions.push(Number(pred.toFixed(2)));
      }
      return predictions;
    };

    const revenueForecast7 = linearForecast(trends.revenueTrend, 7);
    const revenueForecast30 = linearForecast(trends.revenueTrend, 30);

    const salesForecast7 = linearForecast(trends.ordersTrend, 7);
    const salesForecast30 = linearForecast(trends.ordersTrend, 30);

    // Inventory depletion forecast
    const inventoryItems = await this.prisma.inventory.findMany({
      where: { product: { sellerId } },
    });
    const currentInventory = inventoryItems.reduce((acc, item) => acc + item.quantity, 0);
    
    // Calculate average daily rate of inventory sold from orders trend
    const avgDailySales = trends.ordersTrend.reduce((a, b) => a + b, 0) / (trends.ordersTrend.length || 1);
    
    const inventoryForecast7: number[] = [];
    const inventoryForecast30: number[] = [];

    for (let i = 1; i <= 30; i++) {
      const projected = Math.max(0, currentInventory - Math.round(avgDailySales * i));
      if (i <= 7) inventoryForecast7.push(projected);
      inventoryForecast30.push(projected);
    }

    return {
      revenue: {
        forecast7: revenueForecast7,
        forecast30: revenueForecast30,
        totalForecast7: Number(revenueForecast7.reduce((a, b) => a + b, 0).toFixed(2)),
        totalForecast30: Number(revenueForecast30.reduce((a, b) => a + b, 0).toFixed(2)),
      },
      sales: {
        forecast7: salesForecast7,
        forecast30: salesForecast30,
        totalForecast7: Math.round(salesForecast7.reduce((a, b) => a + b, 0)),
        totalForecast30: Math.round(salesForecast30.reduce((a, b) => a + b, 0)),
      },
      inventory: {
        current: currentInventory,
        forecast7: inventoryForecast7,
        forecast30: inventoryForecast30,
        daysOfStockRemaining: avgDailySales > 0 ? Math.round(currentInventory / avgDailySales) : 999, // default indicator if no sales
      },
    };
  }

  // ─── Export Reports Stream Builder ───
  async generateCSVReport(sellerId: string, startDateStr?: string, endDateStr?: string): Promise<string> {
    const products = await this.getProductAnalytics(sellerId, startDateStr, endDateStr);
    
    let csv = 'Product ID,Product Name,Quantity Sold,Revenue Generated,Views\n';
    
    const merged = new Map<string, { name: string; sold: number; rev: number; views: number }>();
    
    products.topSelling.forEach((p: any) => {
      merged.set(p.id, { name: p.name, sold: p.quantity, rev: p.revenue, views: 0 });
    });
    
    products.lowestPerforming.forEach((p: any) => {
      if (!merged.has(p.id)) {
        merged.set(p.id, { name: p.name, sold: p.quantity, rev: p.revenue, views: 0 });
      }
    });

    products.mostViewed.forEach((p: any) => {
      const record = merged.get(p.id);
      if (record) {
        record.views = p.views;
      } else {
        merged.set(p.id, { name: p.name, sold: 0, rev: 0, views: p.views });
      }
    });

    for (const [id, details] of merged.entries()) {
      csv += `"${id}","${details.name.replace(/"/g, '""')}",${details.sold},${details.rev},${details.views}\n`;
    }

    return csv;
  }
}
