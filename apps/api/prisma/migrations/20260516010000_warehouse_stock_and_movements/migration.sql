-- Product.warehouseId field ni olib tashlash
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_warehouseId_fkey";
DROP INDEX IF EXISTS "Product_warehouseId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "warehouseId";

-- CreateEnum: Stock movement turlari
CREATE TYPE "StockMovementType" AS ENUM ('IMPORT', 'ISSUE_TO_SHOP', 'TRANSFER', 'SHOP_RETURN', 'ADJUSTMENT');

-- CreateTable: WarehouseStock — har ombor uchun mahsulot miqdori
CREATE TABLE "WarehouseStock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WarehouseStock_productId_warehouseId_key" ON "WarehouseStock"("productId", "warehouseId");
CREATE INDEX "WarehouseStock_warehouseId_idx" ON "WarehouseStock"("warehouseId");
CREATE INDEX "WarehouseStock_productId_idx" ON "WarehouseStock"("productId");
CREATE INDEX "WarehouseStock_warehouseId_quantity_idx" ON "WarehouseStock"("warehouseId", "quantity");

ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: StockMovement — barcha stock harakatlari tarixi
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
CREATE INDEX "StockMovement_fromWarehouseId_idx" ON "StockMovement"("fromWarehouseId");
CREATE INDEX "StockMovement_toWarehouseId_idx" ON "StockMovement"("toWarehouseId");

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_fromWarehouseId_fkey"
  FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_toWarehouseId_fkey"
  FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
