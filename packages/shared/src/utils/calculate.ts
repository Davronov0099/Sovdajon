/**
 * 3-tier auto-discount based on quantity
 * 10+ → 5%, 50+ → 10%, 100+ → 15%
 */
export function calculateAutoDiscount(quantity: number): number {
  if (quantity >= 100) return 15;
  if (quantity >= 50) return 10;
  if (quantity >= 10) return 5;
  return 0;
}

/**
 * Calculate discount amount from percent
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return Math.round(subtotal * (discountPercent / 100));
}

/**
 * Calculate profit: revenue - cost
 * Sof foyda = (sotish narxi * miqdor) - (tan narx * miqdor)
 */
export function calculateProfit(
  sellPrice: number,
  costPrice: number,
  quantity: number,
): number {
  return (sellPrice - costPrice) * quantity;
}

/**
 * Calculate profit margin as percentage
 */
export function calculateProfitMargin(sellPrice: number, costPrice: number): number {
  if (sellPrice === 0) return 0;
  return Math.round(((sellPrice - costPrice) / sellPrice) * 100);
}

/**
 * Haversine distance between two GPS points (meters)
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if cost price change exceeds threshold (20%)
 */
export function isCostPriceAlertNeeded(
  oldCostPrice: number,
  newCostPrice: number,
  threshold = 20,
): boolean {
  if (oldCostPrice === 0) return false;
  const change = Math.abs(((newCostPrice - oldCostPrice) / oldCostPrice) * 100);
  return change > threshold;
}
