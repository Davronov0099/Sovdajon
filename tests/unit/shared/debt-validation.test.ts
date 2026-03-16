import { describe, it, expect } from 'vitest';
import { createDebtSchema, debtPaymentSchema, debtExtendSchema, debtListQuery } from '@sardorbek/shared';

describe('createDebtSchema', () => {
  const validDebt = {
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 500000,
    dueDate: '2026-04-14T00:00:00.000Z',
  };

  it('should accept valid debt', () => {
    expect(createDebtSchema.safeParse(validDebt).success).toBe(true);
  });

  it('should reject zero amount', () => {
    expect(createDebtSchema.safeParse({ ...validDebt, amount: 0 }).success).toBe(false);
  });

  it('should reject negative amount', () => {
    expect(createDebtSchema.safeParse({ ...validDebt, amount: -1000 }).success).toBe(false);
  });

  it('should reject missing customerId', () => {
    const { customerId: _, ...noCustomer } = validDebt;
    expect(createDebtSchema.safeParse(noCustomer).success).toBe(false);
  });

  it('should reject invalid customerId (not UUID)', () => {
    expect(createDebtSchema.safeParse({ ...validDebt, customerId: 'abc' }).success).toBe(false);
  });

  it('should accept optional note', () => {
    const result = createDebtSchema.safeParse({ ...validDebt, note: 'Test note' });
    expect(result.success).toBe(true);
  });

  it('should reject note > 500 chars', () => {
    const result = createDebtSchema.safeParse({ ...validDebt, note: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('debtPaymentSchema', () => {
  it('should accept valid payment', () => {
    expect(debtPaymentSchema.safeParse({ amount: 100000, method: 'CASH' }).success).toBe(true);
  });

  it('should reject zero amount', () => {
    expect(debtPaymentSchema.safeParse({ amount: 0, method: 'CASH' }).success).toBe(false);
  });

  it('should reject invalid method', () => {
    expect(debtPaymentSchema.safeParse({ amount: 100, method: 'BITCOIN' }).success).toBe(false);
  });

  it('should accept all valid methods', () => {
    for (const method of ['CASH', 'CARD', 'CLICK', 'TRANSFER']) {
      expect(debtPaymentSchema.safeParse({ amount: 100, method }).success).toBe(true);
    }
  });
});

describe('debtExtendSchema', () => {
  it('should accept valid extension', () => {
    expect(debtExtendSchema.safeParse({
      newDate: '2026-05-01T00:00:00.000Z',
      reason: 'Mijoz so\'radi',
    }).success).toBe(true);
  });

  it('should reject empty reason', () => {
    expect(debtExtendSchema.safeParse({
      newDate: '2026-05-01T00:00:00.000Z',
      reason: '',
    }).success).toBe(false);
  });

  it('should reject missing newDate', () => {
    expect(debtExtendSchema.safeParse({ reason: 'Test' }).success).toBe(false);
  });
});

describe('debtListQuery', () => {
  it('should default page=1, limit=20', () => {
    const result = debtListQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should accept valid status filter', () => {
    const result = debtListQuery.parse({ status: 'OVERDUE' });
    expect(result.status).toBe('OVERDUE');
  });

  it('should reject invalid status', () => {
    expect(debtListQuery.safeParse({ status: 'UNKNOWN' }).success).toBe(false);
  });
});
