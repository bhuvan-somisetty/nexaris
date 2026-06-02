-- AlterTable: add MRP / list price. Current `price` is the discounted selling price.
ALTER TABLE "Product" ADD COLUMN "originalPrice" DECIMAL(65,30);
