import { describe, it, expect } from 'vitest';
import { createSupplierSchema, supplierImportSchema, supplierPaymentSchema } from '@sardorbek/shared';

describe('createSupplierSchema', () => {
  it('should accept valid supplier', () => {
    expect(createSupplierSchema.safeParse({ name: 'Test Supplier' }).success).toBe(true);
  });

  it('should reject empty name', () => {
    expect(createSupplierSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = createSupplierSchema.safeParse({
      name: 'Test',
      phone: '+998901234567',
      company: 'Test LLC',
      address: 'Toshkent',
    });
    expect(result.success).toBe(true);
  });
});

describe('supplierImportSchema', () => {
  const validImport = {
    items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 10, unitPrice: 5000 }],
    currency: 'UZS' as const,
  };

  it('should accept valid import', () => {
    expect(supplierImportSchema.safeParse(validImport).success).toBe(true);
  });

  it('should reject empty items', () => {
    expect(supplierImportSchema.safeParse({ ...validImport, items: [] }).success).toBe(false);
  });

  it('should reject zero quantity', () => {
    expect(supplierImportSchema.safeParse({
      ...validImport,
      items: [{ productId: '550e8400-e29b-41d4-a716-446655440000', quantity: 0, unitPrice: 5000 }],
    }).success).toBe(false);
  });

  it('should accept USD currency', () => {
    expect(supplierImportSchema.safeParse({ ...validImport, currency: 'USD', rate: 12800 }).success).toBe(true);
  });

  it('should default currency to UZS', () => {
    const result = supplierImportSchema.parse({ items: validImport.items });
    expect(result.currency).toBe('UZS');
  });

  it('should default rate to 1', () => {
    const result = supplierImportSchema.parse(validImport);
    expect(result.rate).toBe(1);
  });
});

describe('supplierPaymentSchema', () => {
  it('should accept valid payment', () => {
    expect(supplierPaymentSchema.safeParse({ amount: 1000000 }).success).toBe(true);
  });

  it('should reject zero amount', () => {
    expect(supplierPaymentSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it('should accept optional note', () => {
    expect(supplierPaymentSchema.safeParse({ amount: 100, note: 'To\'lov' }).success).toBe(true);
  });
});
