export const DebtStatus = {
  ACTIVE: 'ACTIVE',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CONFLICT: 'CONFLICT',
} as const;

export type DebtStatus = (typeof DebtStatus)[keyof typeof DebtStatus];

export interface Debt {
  id: string;
  customerId: string;
  receiptId: string | null;
  amount: number;
  remainingAmount: number;
  status: DebtStatus;
  dueDate: Date;
  note: string | null;
  offlineId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  method: string;
  note: string | null;
  createdById: string;
  createdAt: Date;
}

export interface DebtExtension {
  id: string;
  debtId: string;
  oldDate: Date;
  newDate: Date;
  reason: string;
  approvedById: string;
  createdAt: Date;
}

export interface CreateDebtPaymentInput {
  amount: number;
  method: string;
  note?: string;
}

export interface ExtendDebtInput {
  newDate: Date;
  reason: string;
}
