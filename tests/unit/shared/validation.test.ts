import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  passwordSchema,
  loginSchema,
  createProductSchema,
  createReceiptSchema,
  paginationSchema,
} from '@sardorbek/shared';

describe('phoneSchema', () => {
  it('should accept +998901234567', () => {
    expect(phoneSchema.safeParse('+998901234567').success).toBe(true);
  });

  it('should reject 8901234567 (no +998)', () => {
    expect(phoneSchema.safeParse('8901234567').success).toBe(false);
  });

  it('should reject +998123 (too short)', () => {
    expect(phoneSchema.safeParse('+998123').success).toBe(false);
  });

  it('should reject empty string', () => {
    expect(phoneSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('should accept "admin1234"', () => {
    expect(passwordSchema.safeParse('admin1234').success).toBe(true);
  });

  it('should reject "12345" (no letter, too short)', () => {
    expect(passwordSchema.safeParse('12345').success).toBe(false);
  });

  it('should reject "abcdef" (no number)', () => {
    expect(passwordSchema.safeParse('abcdef').success).toBe(false);
  });

  it('should reject "ab1" (too short)', () => {
    expect(passwordSchema.safeParse('ab1').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('should accept valid login', () => {
    const result = loginSchema.safeParse({ login: 'admin', password: 'test123' });
    expect(result.success).toBe(true);
  });

  it('should reject empty login', () => {
    const result = loginSchema.safeParse({ login: '', password: 'test123' });
    expect(result.success).toBe(false);
  });

  it('should reject short login', () => {
    const result = loginSchema.safeParse({ login: 'ab', password: 'test123' });
    expect(result.success).toBe(false);
  });
});

describe('createProductSchema', () => {
  const validProduct = {
    name: 'Dastgir 50mm',
    price: 5000,
    costPrice: 3000,
    categoryId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('should accept valid product', () => {
    expect(createProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it('should reject negative price', () => {
    expect(createProductSchema.safeParse({ ...validProduct, price: -100 }).success).toBe(false);
  });

  it('should reject price > 999,999,999', () => {
    expect(createProductSchema.safeParse({ ...validProduct, price: 1_000_000_000 }).success).toBe(false);
  });

  it('should allow stock = 0', () => {
    expect(createProductSchema.safeParse({ ...validProduct, stock: 0 }).success).toBe(true);
  });

  it('should reject missing categoryId', () => {
    const { categoryId, ...noCategory } = validProduct;
    expect(createProductSchema.safeParse(noCategory).success).toBe(false);
  });

  it('should default unit to PIECE', () => {
    const result = createProductSchema.parse(validProduct);
    expect(result.unit).toBe('PIECE');
  });

  it('should default minStock to 5', () => {
    const result = createProductSchema.parse(validProduct);
    expect(result.minStock).toBe(5);
  });
});

describe('createReceiptSchema', () => {
  const validReceipt = {
    items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2 }],
    paymentMethod: 'CASH' as const,
  };

  it('should accept valid receipt', () => {
    expect(createReceiptSchema.safeParse(validReceipt).success).toBe(true);
  });

  it('should reject empty items', () => {
    expect(createReceiptSchema.safeParse({ ...validReceipt, items: [] }).success).toBe(false);
  });

  it('should reject DEBT without customerId', () => {
    expect(
      createReceiptSchema.safeParse({ ...validReceipt, paymentMethod: 'DEBT' }).success,
    ).toBe(false);
  });

  it('should accept DEBT with customerId', () => {
    expect(
      createReceiptSchema.safeParse({
        ...validReceipt,
        paymentMethod: 'DEBT',
        customerId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('should reject MIXED with less than 2 methods', () => {
    expect(
      createReceiptSchema.safeParse({
        ...validReceipt,
        paymentMethod: 'MIXED',
        mixedPayments: [{ method: 'CASH', amount: 1000 }],
      }).success,
    ).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('should default page=1, limit=20', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should coerce string numbers', () => {
    const result = paginationSchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('should cap limit at 100', () => {
    expect(paginationSchema.safeParse({ limit: 200 }).success).toBe(false);
  });
});
