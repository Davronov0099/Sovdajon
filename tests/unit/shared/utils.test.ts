import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  formatReceiptNumber,
  timeAgo,
  calculateAutoDiscount,
  calculateDiscount,
  calculateProfit,
  calculateProfitMargin,
  haversineDistance,
  isCostPriceAlertNeeded,
} from '@sardorbek/shared';

describe('formatCurrency', () => {
  it('formats simple number', () => {
    expect(formatCurrency(1234567)).toBe("1 234 567 so'm");
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe("0 so'm");
  });

  it('formats negative number', () => {
    expect(formatCurrency(-5000)).toBe("-5 000 so'm");
  });

  it('formats without suffix', () => {
    expect(formatCurrency(1000, '')).toBe('1 000');
  });

  it('formats with USD suffix', () => {
    expect(formatCurrency(100, '$')).toBe('100 $');
  });
});

describe('formatDate', () => {
  it('formats Date object', () => {
    expect(formatDate(new Date(2026, 2, 14))).toBe('14.03.2026');
  });

  it('formats string date', () => {
    expect(formatDate('2026-01-01T00:00:00Z')).toBe('01.01.2026');
  });
});

describe('formatPhone', () => {
  it('formats 12-digit number', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123-45-67');
  });

  it('returns unformatted if not 12 digits', () => {
    expect(formatPhone('+12345')).toBe('+12345');
  });
});

describe('formatReceiptNumber', () => {
  it('pads with zeros', () => {
    expect(formatReceiptNumber(42)).toBe('#000042');
  });

  it('handles large numbers', () => {
    expect(formatReceiptNumber(123456)).toBe('#123456');
  });
});

describe('timeAgo', () => {
  it('returns "hozirgina" for < 60s', () => {
    expect(timeAgo(new Date())).toBe('hozirgina');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe('5 daqiqa oldin');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(timeAgo(twoHoursAgo)).toBe('2 soat oldin');
  });
});

describe('calculateAutoDiscount', () => {
  it('returns 0 for < 10', () => expect(calculateAutoDiscount(5)).toBe(0));
  it('returns 5 for 10+', () => expect(calculateAutoDiscount(10)).toBe(5));
  it('returns 10 for 50+', () => expect(calculateAutoDiscount(50)).toBe(10));
  it('returns 15 for 100+', () => expect(calculateAutoDiscount(100)).toBe(15));
  it('returns 15 for 200', () => expect(calculateAutoDiscount(200)).toBe(15));
});

describe('calculateDiscount', () => {
  it('calculates 10% of 100000', () => {
    expect(calculateDiscount(100000, 10)).toBe(10000);
  });

  it('returns 0 for 0%', () => {
    expect(calculateDiscount(50000, 0)).toBe(0);
  });
});

describe('calculateProfit', () => {
  it('calculates correctly', () => {
    expect(calculateProfit(5000, 3000, 10)).toBe(20000);
  });

  it('returns negative for loss', () => {
    expect(calculateProfit(3000, 5000, 5)).toBe(-10000);
  });
});

describe('calculateProfitMargin', () => {
  it('calculates margin', () => {
    expect(calculateProfitMargin(5000, 3000)).toBe(40);
  });

  it('returns 0 for zero price', () => {
    expect(calculateProfitMargin(0, 1000)).toBe(0);
  });
});

describe('haversineDistance', () => {
  it('returns ~0 for same point', () => {
    expect(haversineDistance(41.3, 69.3, 41.3, 69.3)).toBeLessThan(1);
  });

  it('returns reasonable distance for Tashkent points', () => {
    // ~1km apart
    const dist = haversineDistance(41.3111, 69.2797, 41.3200, 69.2797);
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(2000);
  });
});

describe('isCostPriceAlertNeeded', () => {
  it('returns true for > 20% change', () => {
    expect(isCostPriceAlertNeeded(1000, 1300)).toBe(true);
  });

  it('returns false for < 20% change', () => {
    expect(isCostPriceAlertNeeded(1000, 1100)).toBe(false);
  });

  it('returns false for zero old price', () => {
    expect(isCostPriceAlertNeeded(0, 1000)).toBe(false);
  });
});
