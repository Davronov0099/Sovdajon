import { describe, it, expect } from 'vitest';
import { hasPermission } from '@sardorbek/shared';

describe('hasPermission', () => {
  // Admin — full access
  it('ADMIN can create products', () => {
    expect(hasPermission('ADMIN', 'product:create')).toBe(true);
  });

  it('ADMIN can delete receipts', () => {
    expect(hasPermission('ADMIN', 'receipt:delete')).toBe(true);
  });

  it('ADMIN can create debts', () => {
    expect(hasPermission('ADMIN', 'debt:create')).toBe(true);
  });

  // Cashier — limited
  it('CASHIER can read products', () => {
    expect(hasPermission('CASHIER', 'product:read')).toBe(true);
  });

  it('CASHIER can create receipts', () => {
    expect(hasPermission('CASHIER', 'receipt:create')).toBe(true);
  });

  it('CASHIER cannot create products', () => {
    expect(hasPermission('CASHIER', 'product:create')).toBe(false);
  });

  it('CASHIER cannot delete receipts', () => {
    expect(hasPermission('CASHIER', 'receipt:delete')).toBe(false);
  });

  it('CASHIER cannot access dashboard', () => {
    expect(hasPermission('CASHIER', 'dashboard:read')).toBe(false);
  });

  it('CASHIER cannot create debts', () => {
    expect(hasPermission('CASHIER', 'debt:create')).toBe(false);
  });

  // Helper — most restricted
  it('HELPER can read products', () => {
    expect(hasPermission('HELPER', 'product:read')).toBe(true);
  });

  it('HELPER can read warehouse', () => {
    expect(hasPermission('HELPER', 'warehouse:read')).toBe(true);
  });

  it('HELPER cannot create receipts', () => {
    expect(hasPermission('HELPER', 'receipt:create')).toBe(false);
  });

  it('HELPER can check in attendance', () => {
    expect(hasPermission('HELPER', 'attendance:checkin')).toBe(true);
  });
});
