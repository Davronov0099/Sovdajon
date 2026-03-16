export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SalaryStatus = {
  DRAFT: 'DRAFT',
  CALCULATED: 'CALCULATED',
  RECALCULATED: 'RECALCULATED',
  PAID: 'PAID',
} as const;

export type SalaryStatus = (typeof SalaryStatus)[keyof typeof SalaryStatus];

export const AdvanceStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
} as const;

export type AdvanceStatus = (typeof AdvanceStatus)[keyof typeof AdvanceStatus];

export const AttendanceStatus = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT: 'ABSENT',
  HALF_DAY: 'HALF_DAY',
} as const;

export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const ExpenseCategory = {
  RENT: 'RENT',
  SALARY: 'SALARY',
  UTILITIES: 'UTILITIES',
  TRANSPORT: 'TRANSPORT',
  MARKETING: 'MARKETING',
  REPAIR: 'REPAIR',
  TAX: 'TAX',
  OTHER: 'OTHER',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EXPENSE_COLORS: Record<ExpenseCategory, string> = {
  RENT: '#EF4444',
  SALARY: '#3B82F6',
  UTILITIES: '#F59E0B',
  TRANSPORT: '#8B5CF6',
  MARKETING: '#EC4899',
  REPAIR: '#6366F1',
  TAX: '#14B8A6',
  OTHER: '#6B7280',
};

export const PriceHistoryReason = {
  MANUAL: 'MANUAL',
  SUPPLIER_IMPORT: 'SUPPLIER_IMPORT',
  BULK_UPDATE: 'BULK_UPDATE',
} as const;

export type PriceHistoryReason = (typeof PriceHistoryReason)[keyof typeof PriceHistoryReason];
