export const ProductUnit = {
  PIECE: 'PIECE',
  KG: 'KG',
  METER: 'METER',
  SET: 'SET',
  PACK: 'PACK',
  BOX: 'BOX',
} as const;

export type ProductUnit = (typeof ProductUnit)[keyof typeof ProductUnit];

export const StockStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  NEGATIVE: 'NEGATIVE',
} as const;

export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: ProductUnit;
  categoryId: string;
  subCategoryId: string | null;
  images: string[];
  description: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  createdAt: Date;
}

export interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  order: number;
  createdAt: Date;
}

export interface PriceHistory {
  id: string;
  productId: string;
  oldPrice: number;
  newPrice: number;
  oldCostPrice: number | null;
  newCostPrice: number | null;
  reason: string;
  createdById: string;
  createdAt: Date;
}

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock < 0) return StockStatus.NEGATIVE;
  if (stock === 0) return StockStatus.OUT_OF_STOCK;
  if (stock <= minStock) return StockStatus.LOW_STOCK;
  return StockStatus.IN_STOCK;
}
