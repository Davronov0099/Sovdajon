-- Add paidAmount to SupplierTransaction (IMPORT uchun: kirim paytida naqd to'langan summa)
ALTER TABLE "SupplierTransaction"
  ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
