-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_SHIPPED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_DELIVERED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_SUCCESS';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REPORTED';
ALTER TYPE "NotificationType" ADD VALUE 'PRODUCT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'PRODUCT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_ALERT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "type" DROP DEFAULT;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_channel_key" ON "NotificationPreference"("userId", "type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_type_channel_key" ON "NotificationTemplate"("type", "channel");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDeliveryLog" ADD CONSTRAINT "NotificationDeliveryLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
