-- CreateEnum: Marketplace order status
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable: Product — marketplace fields
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "isMarketplaceVisible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "showPrice" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: MarketplaceOrder
CREATE TABLE "MarketplaceOrder" (
    "id" SERIAL NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalUzs" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceOrder_status_idx" ON "MarketplaceOrder"("status");
CREATE INDEX "MarketplaceOrder_createdAt_idx" ON "MarketplaceOrder"("createdAt");

-- CreateTable: MarketplaceOrderItem
CREATE TABLE "MarketplaceOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceUzs" DECIMAL(18,2) NOT NULL,
    "totalUzs" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "MarketplaceOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");
CREATE INDEX "MarketplaceOrderItem_productId_idx" ON "MarketplaceOrderItem"("productId");

-- AddForeignKey
ALTER TABLE "MarketplaceOrderItem"
  ADD CONSTRAINT "MarketplaceOrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceOrderItem"
  ADD CONSTRAINT "MarketplaceOrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
