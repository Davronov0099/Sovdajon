import { randomUUID } from 'crypto';

// Deterministic test data factories — no faker needed for basic tests

let counter = 0;
function nextId(): string {
  return randomUUID();
}
function nextNum(): number {
  return ++counter;
}

// ==================== USER ====================

export function createUser(overrides: Record<string, unknown> = {}) {
  const n = nextNum();
  return {
    id: nextId(),
    login: `user_${n}`,
    name: `Test User ${n}`,
    role: 'CASHIER' as const,
    phone: `+99890${String(n).padStart(7, '0')}`,
    isActive: true,
    isDeleted: false,
    ...overrides,
  };
}

export function createAdmin(overrides: Record<string, unknown> = {}) {
  return createUser({ role: 'ADMIN', ...overrides });
}

// ==================== PRODUCT ====================

export function createProduct(overrides: Record<string, unknown> = {}) {
  const n = nextNum();
  return {
    id: nextId(),
    name: `Test Product ${n}`,
    price: 10000 + n * 1000,
    costPrice: 5000 + n * 500,
    stock: 100,
    minStock: 5,
    unit: 'PIECE' as const,
    categoryId: nextId(),
    subCategoryId: null,
    images: [],
    description: null,
    isDeleted: false,
    ...overrides,
  };
}

// ==================== CUSTOMER ====================

export function createCustomer(overrides: Record<string, unknown> = {}) {
  const n = nextNum();
  return {
    id: nextId(),
    name: `Test Customer ${n}`,
    phone: `+99891${String(n).padStart(7, '0')}`,
    address: null,
    debtLimit: null,
    loyaltyPoints: 0,
    note: null,
    isDeleted: false,
    ...overrides,
  };
}

// ==================== RECEIPT ====================

export function createReceiptInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { productId: nextId(), quantity: 2, discount: 0 },
    ],
    paymentMethod: 'CASH' as const,
    discountPercent: 0,
    ...overrides,
  };
}

// ==================== DEBT ====================

export function createDebtInput(overrides: Record<string, unknown> = {}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);
  return {
    customerId: nextId(),
    amount: 500000,
    dueDate: tomorrow.toISOString(),
    note: null,
    ...overrides,
  };
}

// ==================== EXPENSE ====================

export function createExpenseInput(overrides: Record<string, unknown> = {}) {
  return {
    category: 'OTHER' as const,
    amount: 100000,
    description: `Test expense ${nextNum()}`,
    date: new Date().toISOString(),
    ...overrides,
  };
}

// ==================== SUPPLIER ====================

export function createSupplierInput(overrides: Record<string, unknown> = {}) {
  const n = nextNum();
  return {
    name: `Test Supplier ${n}`,
    phone: `+99892${String(n).padStart(7, '0')}`,
    company: `Company ${n}`,
    ...overrides,
  };
}

export function createImportInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { productId: nextId(), quantity: 50, unitPrice: 3000 },
    ],
    currency: 'UZS' as const,
    rate: 1,
    note: null,
    ...overrides,
  };
}

// Reset counter for test isolation
export function resetFactories() {
  counter = 0;
}
