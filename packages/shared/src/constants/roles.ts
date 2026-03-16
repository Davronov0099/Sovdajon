import type { Role } from '../types/user';

export const PERMISSIONS = {
  // Product
  'product:read': ['ADMIN', 'CASHIER', 'HELPER'],
  'product:create': ['ADMIN'],
  'product:update': ['ADMIN'],
  'product:delete': ['ADMIN'],

  // Category
  'category:read': ['ADMIN', 'CASHIER', 'HELPER'],
  'category:create': ['ADMIN'],
  'category:update': ['ADMIN'],
  'category:delete': ['ADMIN'],

  // Receipt / POS
  'receipt:read': ['ADMIN', 'CASHIER'],
  'receipt:create': ['ADMIN', 'CASHIER'],
  'receipt:delete': ['ADMIN'],
  'receipt:return': ['ADMIN', 'CASHIER'],

  // Debt
  'debt:read': ['ADMIN', 'CASHIER'],
  'debt:create': ['ADMIN'],
  'debt:pay': ['ADMIN'],
  'debt:extend': ['ADMIN'],

  // Customer
  'customer:read': ['ADMIN', 'CASHIER', 'HELPER'],
  'customer:create': ['ADMIN', 'CASHIER'],
  'customer:update': ['ADMIN'],
  'customer:delete': ['ADMIN'],

  // Supplier
  'supplier:read': ['ADMIN'],
  'supplier:create': ['ADMIN'],
  'supplier:update': ['ADMIN'],
  'supplier:delete': ['ADMIN'],

  // Expense
  'expense:read': ['ADMIN'],
  'expense:create': ['ADMIN'],
  'expense:update': ['ADMIN'],
  'expense:delete': ['ADMIN'],

  // HR
  'user:read': ['ADMIN'],
  'user:create': ['ADMIN'],
  'user:update': ['ADMIN'],
  'user:delete': ['ADMIN'],
  'salary:read': ['ADMIN'],
  'salary:calculate': ['ADMIN'],
  'salary:pay': ['ADMIN'],
  'salary:recalculate': ['ADMIN'],
  'attendance:read': ['ADMIN'],
  'attendance:checkin': ['ADMIN', 'CASHIER', 'HELPER'],
  'advance:read': ['ADMIN'],
  'advance:create': ['ADMIN'],
  'advance:approve': ['ADMIN'],
  'kpi:read': ['ADMIN'],
  'kpi:manage': ['ADMIN'],
  'fine:manage': ['ADMIN'],
  'cashier-session:read': ['ADMIN'],

  // Dashboard
  'dashboard:read': ['ADMIN'],
  'dashboard:export': ['ADMIN'],

  // Settings
  'settings:read': ['ADMIN'],
  'settings:update': ['ADMIN'],

  // Monitoring
  'monitoring:read': ['ADMIN'],

  // Order
  'order:read': ['ADMIN', 'CASHIER'],
  'order:create': ['ADMIN'],
  'order:update': ['ADMIN'],

  // Warehouse
  'warehouse:read': ['ADMIN', 'HELPER'],
  'warehouse:create': ['ADMIN'],
  'warehouse:update': ['ADMIN'],

  // Contact
  'contact:read': ['ADMIN', 'CASHIER'],
  'contact:create': ['ADMIN', 'CASHIER'],
  'contact:update': ['ADMIN'],
  'contact:delete': ['ADMIN'],

  // Partner
  'partner:read': ['ADMIN'],
  'partner:create': ['ADMIN'],
  'partner:update': ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly string[]).includes(role);
}
