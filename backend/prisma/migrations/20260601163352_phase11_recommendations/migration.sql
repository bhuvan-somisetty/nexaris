-- CreateTable
CREATE TABLE "ProductSimilarity" (
    "id" TEXT NOT NULL,
    "productIdA" TEXT NOT NULL,
    "productIdB" TEXT NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferenceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredCategories" JSONB NOT NULL,
    "preferredBrands" JSONB NOT NULL,
    "priceRangeLow" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceRangeHigh" DECIMAL(65,30) NOT NULL DEFAULT 100000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "recommendationType" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "interaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSimilarity_productIdA_score_idx" ON "ProductSimilarity"("productIdA", "score");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSimilarity_productIdA_productIdB_key" ON "ProductSimilarity"("productIdA", "productIdB");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceProfile_userId_key" ON "UserPreferenceProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationCache_cacheKey_key" ON "RecommendationCache"("cacheKey");

-- CreateIndex
CREATE INDEX "RecommendationCache_cacheKey_expiresAt_idx" ON "RecommendationCache"("cacheKey", "expiresAt");

-- CreateIndex
CREATE INDEX "RecommendationEvent_userId_recommendationType_idx" ON "RecommendationEvent"("userId", "recommendationType");

-- CreateIndex
CREATE INDEX "RecommendationEvent_productId_idx" ON "RecommendationEvent"("productId");

-- CreateIndex
CREATE INDEX "RecommendationEvent_createdAt_idx" ON "RecommendationEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "ProductSimilarity" ADD CONSTRAINT "ProductSimilarity_productIdA_fkey" FOREIGN KEY ("productIdA") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilarity" ADD CONSTRAINT "ProductSimilarity_productIdB_fkey" FOREIGN KEY ("productIdB") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferenceProfile" ADD CONSTRAINT "UserPreferenceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationEvent" ADD CONSTRAINT "RecommendationEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
