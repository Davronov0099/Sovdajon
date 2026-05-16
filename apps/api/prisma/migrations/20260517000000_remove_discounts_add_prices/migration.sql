-- Product: chegirma fieldlarni olib tashlash, yangi narx fieldlarini qo'shish
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discountPercent";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount1Qty";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount1Pct";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount2Qty";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount2Pct";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount3Qty";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "discount3Pct";

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minSellingPrice" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wholesalePrice"  DECIMAL(12,2);

-- Receipt: discount va discountPercent olib tashlash
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "discount";
ALTER TABLE "Receipt" DROP COLUMN IF EXISTS "discountPercent";

-- ReceiptItem: discount olib tashlash
ALTER TABLE "ReceiptItem" DROP COLUMN IF EXISTS "discount";
