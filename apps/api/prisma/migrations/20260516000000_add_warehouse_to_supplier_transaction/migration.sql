-- AlterTable: SupplierTransaction ga warehouseId qo'shish
ALTER TABLE "SupplierTransaction" ADD COLUMN "warehouseId" TEXT;

-- AddForeignKey
ALTER TABLE "SupplierTransaction" ADD CONSTRAINT "SupplierTransaction_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "SupplierTransaction_warehouseId_idx" ON "SupplierTransaction"("warehouseId");
