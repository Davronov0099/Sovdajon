export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  CLICK: 'CLICK',
  TRANSFER: 'TRANSFER',
  DEBT: 'DEBT',
  MIXED: 'MIXED',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface Receipt {
  id: string;
  number: number;
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number | null;
  change: number | null;
  customerId: string | null;
  createdById: string;
  isDraft: boolean;
  createdAt: Date;
}

export interface ReceiptItem {
  id: string;
  receiptId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  total: number;
}

export interface MixedPaymentDetail {
  method: Exclude<PaymentMethod, 'MIXED' | 'DEBT'>;
  amount: number;
}

export interface ReturnReceipt {
  id: string;
  receiptId: string;
  total: number;
  reason: string;
  createdById: string;
  createdAt: Date;
}

export interface ReturnReceiptItem {
  id: string;
  returnReceiptId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

