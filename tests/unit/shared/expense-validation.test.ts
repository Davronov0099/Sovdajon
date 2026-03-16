import { describe, it, expect } from 'vitest';
import { createExpenseSchema, expenseListQuery } from '@sardorbek/shared';

describe('createExpenseSchema', () => {
  const valid = {
    category: 'RENT' as const,
    amount: 5000000,
    description: 'Oylik ijara',
  };

  it('should accept valid expense', () => {
    expect(createExpenseSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject zero amount', () => {
    expect(createExpenseSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it('should reject empty description', () => {
    expect(createExpenseSchema.safeParse({ ...valid, description: '' }).success).toBe(false);
  });

  it('should reject invalid category', () => {
    expect(createExpenseSchema.safeParse({ ...valid, category: 'FOOD' }).success).toBe(false);
  });

  it('should accept all valid categories', () => {
    const categories = ['RENT', 'SALARY', 'UTILITIES', 'TRANSPORT', 'MARKETING', 'REPAIR', 'TAX', 'OTHER'];
    for (const category of categories) {
      expect(createExpenseSchema.safeParse({ ...valid, category }).success).toBe(true);
    }
  });

  it('should accept optional date', () => {
    const result = createExpenseSchema.safeParse({ ...valid, date: '2026-03-14T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });
});

describe('expenseListQuery', () => {
  it('should default page=1, limit=20', () => {
    const result = expenseListQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should accept category filter', () => {
    const result = expenseListQuery.parse({ category: 'RENT' });
    expect(result.category).toBe('RENT');
  });

  it('should coerce string page', () => {
    const result = expenseListQuery.parse({ page: '3' });
    expect(result.page).toBe(3);
  });
});
