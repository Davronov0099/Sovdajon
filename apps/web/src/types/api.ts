// Centralized API response types — no more `Record<string, unknown>` casting

import type { Role, PaymentMethod } from '@sardorbek/shared';

// ==================== COMMON ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== AUTH ====================

export interface UserProfile {
  id: string;
  login: string;
  name: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

// ==================== PRODUCT ====================

export interface ProductItem {
  id: string;
  code: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: string; // Decimal from Prisma comes as string
  costPrice: string;
  stock: number;
  minStock: number;
  unit: string;
  categoryId: string;
  subCategoryId: string | null;
  images: string[];
  description: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
  subCategory: { id: string; name: string } | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  subCategories: SubCategoryItem[];
  _count: { products: number };
}

export interface SubCategoryItem {
  id: string;
  name: string;
  categoryId: string;
  order: number;
}

// ==================== RECEIPT ====================

export interface ReceiptItem {
  id: string;
  number: number;
  subtotal: string;
  discount: string;
  discountPercent: string;
  total: string;
  paymentMethod: PaymentMethod;
  cashReceived: string | null;
  change: string | null;
  customerId: string | null;
  createdById: string;
  isDraft: boolean;
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
  createdBy: { id: string; name: string };
  items: ReceiptLineItem[];
}

export interface ReceiptLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  costPrice: string;
  discount: string;
  total: string;
}

// ==================== DEBT ====================

export type DebtStatus = 'ACTIVE' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CONFLICT';

export interface DebtItem {
  id: string;
  customerId: string;
  receiptId: string | null;
  amount: string;
  remainingAmount: string;
  status: DebtStatus;
  dueDate: string;
  note: string | null;
  offlineId: string | null;
  createdById: string;
  createdAt: string;
  customer: { id: string; name: string; phone: string };
  createdBy: { id: string; name: string };
  payments: DebtPaymentItem[];
  _count: { payments: number; extensions: number };
}

export interface DebtPaymentItem {
  id: string;
  debtId: string;
  amount: string;
  method: string;
  note: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

export interface DebtExtensionItem {
  id: string;
  oldDate: string;
  newDate: string;
  reason: string;
  createdAt: string;
  approvedBy: { id: string; name: string };
}

export interface DebtStats {
  totalAmount: number;
  totalRemaining: number;
  totalCount: number;
  overdueCount: number;
  topDebtors: {
    customer: { id: string; name: string; phone: string };
    remaining: number;
  }[];
}

export interface DebtListResponse {
  success: boolean;
  data: DebtItem[];
  pagination: Pagination;
  stats: { status: DebtStatus; _sum: { remainingAmount: string | null }; _count: number }[];
}

// ==================== CUSTOMER ====================

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  debtLimit: string | null;
  loyaltyPoints: number;
  note: string | null;
  createdAt: string;
  _count?: { debts: number; receipts: number };
}

// ==================== SUPPLIER ====================

export interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  balance: string;
  createdAt: string;
  _count: { transactions: number };
}

export interface SupplierTransactionItem {
  id: string;
  type: string;
  total: string;
  currency: string;
  rate: string;
  note: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    total: string;
    product: { id: string; name: string };
  }[];
}

// ==================== EXPENSE ====================

export type ExpenseCategory = 'RENT' | 'SALARY' | 'UTILITIES' | 'TRANSPORT' | 'MARKETING' | 'REPAIR' | 'TAX' | 'OTHER';

export interface ExpenseItem {
  id: string;
  category: ExpenseCategory;
  amount: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  byCategory: {
    category: string;
    amount: number;
    count: number;
  }[];
}

// ==================== ATTENDANCE ====================

export type AttendanceStatusType = 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';

export interface AttendanceRecord {
  id: string;
  userId: string;
  checkIn: string;
  checkOut: string | null;
  status: AttendanceStatusType;
  lat: number | null;
  lng: number | null;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string; avatar: string | null };
}

export interface TodayAttendanceData {
  records: AttendanceRecord[];
  stats: {
    total: number;
    present: number;
    late: number;
    checkedOut: number;
    absent: number;
  };
  absentUsers: { id: string; name: string; role: string }[];
}

export interface UserAttendanceSummary {
  records: AttendanceRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    lateDays: number;
    halfDays: number;
    totalHours: number;
  };
}

// ==================== SALARY ====================

export type SalaryStatusType = 'DRAFT' | 'CALCULATED' | 'RECALCULATED' | 'PAID';

export interface SalaryItem {
  id: string;
  userId: string;
  month: string;
  base: string;
  kpiBonus: string;
  salesBonus: string;
  advances: string;
  fines: string;
  total: string;
  status: SalaryStatusType;
  paidAt: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

export interface SalarySettingItem {
  id: string;
  userId: string;
  baseSalary: string;
  salesPercent: string;
}

// ==================== ADVANCE ====================

export type AdvanceStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface AdvanceItem {
  id: string;
  userId: string;
  amount: string;
  reason: string | null;
  status: AdvanceStatusType;
  approvedById: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
  approvedBy: { id: string; name: string } | null;
}

// ==================== KPI ====================

export interface KpiTemplateItem {
  id: string;
  name: string;
  description: string | null;
  targetValue: string;
  unit: string;
  bonusAmount: string;
}

export interface KpiAssignmentItem {
  id: string;
  templateId: string;
  userId: string;
  month: string;
  createdAt: string;
  template: KpiTemplateItem;
  user: { id: string; name: string; role: string };
  records: KpiRecordItem[];
}

export interface KpiRecordItem {
  id: string;
  assignmentId: string;
  value: string;
  date: string;
  userId: string;
}

export interface KpiAssignmentWithProgress extends KpiAssignmentItem {
  totalValue: number;
  progressPercent: number;
  earnedBonus: number;
}

// ==================== FINE ====================

export interface FineItem {
  id: string;
  userId: string;
  amount: string;
  reason: string;
  month: string;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string };
  createdBy: { id: string; name: string };
}

// ==================== CASHIER SESSION ====================

export interface CashierSessionItem {
  id: string;
  userId: string;
  openedAt: string;
  closedAt: string | null;
  openingBalance: string;
  closingBalance: string | null;
  note: string | null;
  user?: { id: string; name: string; role: string };
}

// ==================== STORE LOCATION ====================

export interface StoreLocationItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  qrToken: string;
}

// ==================== SETTINGS ====================

// ==================== WAREHOUSE ====================

export interface WarehouseItem {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
}

// ==================== CONTACT ====================

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  categoryId: string | null;
  note: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
}

export interface ContactCategoryItem {
  id: string;
  name: string;
  _count: { contacts: number };
}

// ==================== SETTINGS ====================

export interface SettingsMap {
  [key: string]: string;
}
