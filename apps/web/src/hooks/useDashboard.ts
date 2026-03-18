import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ApiResponse } from '@/types/api';

interface DashboardSummary {
  totalSales: number;
  totalCount: number;
  cash: number;
  card: number;
  click: number;
  debt: number;
  totalDiscount: number;
  totalExpenses: number;
  activeDebts: number;
  debtCount: number;
  profit: number;
}

interface TrendPoint { date: string; total: number; count: number }
interface TopProduct { productId: string; productName: string; totalQty: number; totalRevenue: number }
interface TopCustomer { customerId: string; customerName: string; totalSpent: number; receiptCount: number }
interface CategorySale { categoryName: string; total: number }
interface HourlySale { hour: number; total: number; count: number }
interface ProfitPoint { date: string; revenue: number; cost: number; profit: number }
interface CashierPerf { userId: string; userName: string; totalSales: number; receiptCount: number }
interface DebtAgingRow { period: string; amount: number; count: number }

function dateParams(start?: string, end?: string) {
  const params: Record<string, string> = {};
  if (start) params.startDate = start;
  if (end) params.endDate = end;
  return params;
}

export function useDashboardSummary(start?: string, end?: string) {
  return useQuery<ApiResponse<DashboardSummary>>({
    queryKey: ['dashboard', 'summary', start, end],
    queryFn: () => api.get('dashboard/summary', { searchParams: dateParams(start, end) }).json<ApiResponse<DashboardSummary>>(),
    staleTime: 60_000,
  });
}

export function useSalesTrend(start?: string, end?: string) {
  return useQuery<ApiResponse<TrendPoint[]>>({
    queryKey: ['dashboard', 'sales-trend', start, end],
    queryFn: () => api.get('dashboard/sales-trend', { searchParams: dateParams(start, end) }).json<ApiResponse<TrendPoint[]>>(),
    staleTime: 60_000,
  });
}

export function useTopProducts(start?: string, end?: string) {
  return useQuery<ApiResponse<TopProduct[]>>({
    queryKey: ['dashboard', 'top-products', start, end],
    queryFn: () => api.get('dashboard/top-products', { searchParams: dateParams(start, end) }).json<ApiResponse<TopProduct[]>>(),
    staleTime: 60_000,
  });
}

export function useTopCustomers(start?: string, end?: string) {
  return useQuery<ApiResponse<TopCustomer[]>>({
    queryKey: ['dashboard', 'top-customers', start, end],
    queryFn: () => api.get('dashboard/top-customers', { searchParams: dateParams(start, end) }).json<ApiResponse<TopCustomer[]>>(),
    staleTime: 60_000,
  });
}

export function useCategorySales(start?: string, end?: string) {
  return useQuery<ApiResponse<CategorySale[]>>({
    queryKey: ['dashboard', 'category-sales', start, end],
    queryFn: () => api.get('dashboard/category-sales', { searchParams: dateParams(start, end) }).json<ApiResponse<CategorySale[]>>(),
    staleTime: 60_000,
  });
}

export function useHourlySales(start?: string, end?: string) {
  return useQuery<ApiResponse<HourlySale[]>>({
    queryKey: ['dashboard', 'hourly', start, end],
    queryFn: () => api.get('dashboard/hourly', { searchParams: dateParams(start, end) }).json<ApiResponse<HourlySale[]>>(),
    staleTime: 60_000,
  });
}

export function useProfitTrend(start?: string, end?: string) {
  return useQuery<ApiResponse<ProfitPoint[]>>({
    queryKey: ['dashboard', 'profit-trend', start, end],
    queryFn: () => api.get('dashboard/profit-trend', { searchParams: dateParams(start, end) }).json<ApiResponse<ProfitPoint[]>>(),
    staleTime: 60_000,
  });
}

export function useCashierPerformance(start?: string, end?: string) {
  return useQuery<ApiResponse<CashierPerf[]>>({
    queryKey: ['dashboard', 'cashier-performance', start, end],
    queryFn: () => api.get('dashboard/cashier-performance', { searchParams: dateParams(start, end) }).json<ApiResponse<CashierPerf[]>>(),
    staleTime: 60_000,
  });
}

export function useDebtAging() {
  return useQuery<ApiResponse<DebtAgingRow[]>>({
    queryKey: ['dashboard', 'debt-aging'],
    queryFn: () => api.get('dashboard/debt-aging').json<ApiResponse<DebtAgingRow[]>>(),
    staleTime: 60_000,
  });
}
