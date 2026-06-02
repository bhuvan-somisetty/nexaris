import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

async function runVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const searchService = app.get(SearchService);
  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);

  console.log('\n==================================================');
  console.log('     PHASE 13 SEARCH VERIFICATION PROTOCOL        ');
  console.log('==================================================\n');

  let passed = true;

  try {
    // -------------------------------------------------------------------------
    // 1. Search Synonyms Verification
    // -------------------------------------------------------------------------
    console.log('1. Testing Synonym Expansion...');
    const expanded = await searchService.expandQueryWithSynonyms('iphone');
    console.log(`   - "iphone" expanded query syntax: ${expanded}`);
    if (expanded.includes('apple & phone')) {
      console.log('   [PASS] Synonym iphone -> apple & phone matched!');
    } else {
      console.log('   [FAIL] Synonym mapping failed.');
      passed = false;
    }

    // Perform query using expanded synonym: "apple phone" should fetch "iPhone 15 Pro"
    const synonymSearchResult = await searchService.searchProducts(null, {
      q: 'apple phone',
    });
    console.log(
      `   - Synonym search count for "apple phone": ${synonymSearchResult.total}`,
    );
    const foundProductNames = synonymSearchResult.products.map(
      (p) => p.product.name,
    );
    console.log(`   - Products found:`, foundProductNames);
    if (foundProductNames.some((name) => name.includes('iPhone 15 Pro'))) {
      console.log(
        '   [PASS] Synonym search retrieved iPhone 15 Pro successfully!',
      );
    } else {
      console.log('   [FAIL] Synonym search failed to retrieve iPhone 15 Pro.');
      passed = false;
    }

    // -------------------------------------------------------------------------
    // 2. Typo-Tolerance & Trigram Fallback Verification
    // -------------------------------------------------------------------------
    console.log('\n2. Testing Typo-Tolerance Fallback...');
    // "ipone" has typo, FTS lexical returns zero results, falling back to trigram
    const typoSearchResult = await searchService.searchProducts(null, {
      q: 'ipone',
    });
    console.log(`   - Typo search results count: ${typoSearchResult.total}`);
    console.log(
      `   - Fuzzy fallback triggered: ${typoSearchResult.isFuzzyFallback}`,
    );
    const fuzzyProductNames = typoSearchResult.products.map(
      (p) => p.product.name,
    );
    console.log(`   - Products found via fuzzy:`, fuzzyProductNames);

    if (
      typoSearchResult.isFuzzyFallback &&
      fuzzyProductNames.some((name) => name.includes('iPhone 15 Pro'))
    ) {
      console.log('   [PASS] Typo tolerance fallback trigger is operational!');
    } else {
      console.log(
        '   [FAIL] Typo tolerance fallback did not trigger or match.',
      );
      passed = false;
    }

    // -------------------------------------------------------------------------
    // 3. Search Ranking Weights & Stock Penalties Verification
    // -------------------------------------------------------------------------
    console.log('\n3. Testing Search Ranking & Stock Penalties...');

    // Let's modify inventories to check stock status multipliers
    // Find iPhone 15 Pro and update stock to in_stock
    const iphone = await prisma.product.findFirst({
      where: { name: 'iPhone 15 Pro' },
    });
    if (!iphone) {
      throw new Error('iPhone 15 Pro seed missing');
    }

    // Fetch and check scoring multipliers
    const rankingResults = await searchService.searchProducts(null, {
      q: 'iphone',
    });
    const iphoneResultItem = rankingResults.products.find(
      (p) => p.product.id === iphone.id,
    );
    if (iphoneResultItem) {
      console.log(`   - Found product score: ${iphoneResultItem.score}%`);
      console.log(
        `   - Stock multiplier applied: ${iphoneResultItem.stockMultiplier}`,
      );
      if (iphoneResultItem.stockMultiplier === 1.0) {
        console.log('   [PASS] In-stock multiplier 1.0 applied successfully!');
      } else {
        console.log(
          `   [FAIL] Incorrect multiplier applied for in-stock item (got ${iphoneResultItem.stockMultiplier})`,
        );
        passed = false;
      }
    }

    // Update iPhone to out-of-stock (qty = 0) and check penalty
    console.log('   - Modifying stock of iPhone to 0 (out of stock)...');
    await prisma.inventory.update({
      where: { productId: iphone.id },
      data: { quantity: 0 },
    });

    const penalizedResults = await searchService.searchProducts(null, {
      q: 'iphone',
    });
    const penalizedIphoneItem = penalizedResults.products.find(
      (p) => p.product.id === iphone.id,
    );
    if (penalizedIphoneItem) {
      console.log(
        `   - Out-of-stock product score: ${penalizedIphoneItem.score}%`,
      );
      console.log(
        `   - Penalty multiplier applied: ${penalizedIphoneItem.stockMultiplier}`,
      );
      if (penalizedIphoneItem.stockMultiplier === 0.05) {
        console.log(
          '   [PASS] Out-of-stock penalty of 0.05 applied successfully!',
        );
      } else {
        console.log(
          `   [FAIL] Incorrect penalty applied for out-of-stock item (got ${penalizedIphoneItem.stockMultiplier})`,
        );
        passed = false;
      }
    }

    // Reset stock to 20 (in_stock)
    await prisma.inventory.update({
      where: { productId: iphone.id },
      data: { quantity: 20 },
    });

    // -------------------------------------------------------------------------
    // 4. Performance & Response Time Verification
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Search Query Latency (Performance)...');
    const start = process.hrtime();
    await searchService.searchProducts(null, { q: 'macbook' });
    const end = process.hrtime(start);
    const ms = (end[0] * 1000 + end[1] / 1000000).toFixed(2);
    console.log(`   - Search execution elapsed time: ${ms} ms`);
    if (Number(ms) < 100) {
      console.log(`   [PASS] Query executed under 100ms constraint!`);
    } else {
      console.log(`   [WARNING] Query exceeded 100ms duration (got ${ms}ms)`);
    }

    // -------------------------------------------------------------------------
    // 5. Analytics logs (Impressions, Clicks, Conversions) Verification
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Click & Conversion Analytics Logging...');

    // Clear search logs to have a clean start
    await prisma.searchClickLog.deleteMany({});
    await prisma.searchQueryLog.deleteMany({});

    const queryText = 'wireless headphones';
    const initialSearchResult = await searchService.searchProducts(null, {
      q: queryText,
    });
    const searchLogId = initialSearchResult.searchQueryLogId;
    console.log(`   - SearchQueryLog record created, ID: ${searchLogId}`);

    if (searchLogId) {
      const headset = await prisma.product.findFirst({
        where: { name: { contains: 'Wireless Headphones' } },
      });
      if (headset) {
        console.log(
          `   - Simulating click on product: "${headset.name}" (ID: ${headset.id})`,
        );
        const clickLog = await searchService.logSearchClick(
          searchLogId,
          headset.id,
        );
        console.log(
          `   - Click log successfully saved in DB, ID: ${clickLog.id}`,
        );

        // Mark click converted
        await prisma.searchClickLog.update({
          where: { id: clickLog.id },
          data: { isConverted: true },
        });

        // Query Seller Analytics to verify click CTR and Funnel data
        console.log(
          `   - Querying Seller Analytics for Seller ID: ${headset.sellerId}`,
        );
        const sellerAnalytics = await searchService.getSellerSearchAnalytics(
          headset.sellerId,
        );
        console.log(`   - Seller Impressions: ${sellerAnalytics.impressions}`);
        console.log(`   - Seller Click CTR: ${sellerAnalytics.ctr}%`);
        console.log(
          `   - Seller Conversion Rate: ${sellerAnalytics.conversionRate}%`,
        );
        console.log(`   - Funnel data:`, sellerAnalytics.funnel);
        console.log(
          `   - Top matching keyword queries:`,
          sellerAnalytics.topKeywords,
        );

        if (
          sellerAnalytics.funnel.clicks === 1 &&
          sellerAnalytics.funnel.purchases === 1
        ) {
          console.log(
            '   [PASS] Click & Conversion Analytics logged and computed successfully!',
          );
        } else {
          console.log('   [FAIL] Analytics calculations mismatched.');
          passed = false;
        }
      } else {
        console.log(
          '   [WARNING] Seeded product for wireless headphones missing. Skipping click mock.',
        );
      }
    } else {
      console.log(
        '   [FAIL] SearchQueryLog was not logged during searchProducts call.',
      );
      passed = false;
    }
  } catch (err) {
    console.error('Verification error:', err);
    passed = false;
  } finally {
    await app.close();
  }

  console.log('\n==================================================');
  if (passed) {
    console.log('   ✓ VERIFICATION STATUS: SUCCESS (ALL PASSED)');
  } else {
    console.log('   ✗ VERIFICATION STATUS: FAILURE');
  }
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runVerification();
