-- Add latitude/longitude to Supplier for location pin (xarita pin)
ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
