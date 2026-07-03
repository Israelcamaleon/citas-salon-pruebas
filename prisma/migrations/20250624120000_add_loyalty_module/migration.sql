-- CreateEnum
CREATE TYPE "LoyaltyProgramType" AS ENUM ('STAMP', 'DISCOUNT', 'GIFT', 'COUPON', 'PREPAID', 'CASHBACK', 'SERVICE');

-- CreateEnum
CREATE TYPE "LoyaltyCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('STAMP', 'REDEEM', 'LOAD', 'DISCOUNT_APPLY', 'COUPON_USE', 'CASHBACK_EARN', 'CASHBACK_REDEEM', 'SERVICE_USE');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN "authUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_authUserId_key" ON "Staff"("authUserId");

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LoyaltyProgramType" NOT NULL,
    "config" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#378ADD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" SERIAL NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "status" "LoyaltyCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "serviceUsage" JSONB,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" SERIAL NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "purchaseAmt" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" INTEGER NOT NULL,
    "staffId" INTEGER,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCouponUse" (
    "id" SERIAL NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,

    CONSTRAINT "LoyaltyCouponUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoyaltyCard_customerId_idx" ON "LoyaltyCard"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyCard_programId_idx" ON "LoyaltyCard"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_customerId_programId_key" ON "LoyaltyCard"("customerId", "programId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_cardId_idx" ON "LoyaltyTransaction"("cardId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_createdAt_idx" ON "LoyaltyTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCouponUse_programId_customerId_key" ON "LoyaltyCouponUse"("programId", "customerId");

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCouponUse" ADD CONSTRAINT "LoyaltyCouponUse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCouponUse" ADD CONSTRAINT "LoyaltyCouponUse_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
