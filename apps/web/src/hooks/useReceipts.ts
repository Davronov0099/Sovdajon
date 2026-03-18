import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateReceiptInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, ReceiptItem } from '@/types/api';

interface ReceiptsQuery {
  page?: number;
  limit?: number;
  search?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  isDraft?: boolean;
}

export function useReceipts(query: ReceiptsQuery = {}) {
  return useQuery<PaginatedApiResponse<ReceiptItem>>({
    queryKey: ['receipts', query],
    queryFn: () =>
      api.get('receipts', { searchParams: query as Record<string, string> })
        .json<PaginatedApiResponse<ReceiptItem>>(),
    staleTime: 30_000,
  });
}

export function useReceipt(id: string) {
  return useQuery<ApiResponse<ReceiptItem>>({
    queryKey: ['receipt', id],
    queryFn: () => api.get(`receipts/${id}`).json<ApiResponse<ReceiptItem>>(),
    enabled: !!id,
  });
}

export function useCreateReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReceiptInput) =>
      api.post('receipts', { json: data }).json<ApiResponse<ReceiptItem>>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSaveDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReceiptInput) =>
      api.post('receipts/draft', { json: data }).json<ApiResponse<ReceiptItem>>(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); },
  });
}

export function useHelperCarts() {
  return useQuery<ApiResponse<ReceiptItem[]>>({
    queryKey: ['receipts', 'helper-carts'],
    queryFn: () => api.get('receipts/helper-carts').json<ApiResponse<ReceiptItem[]>>(),
    refetchInterval: 10_000, // Har 10 sekundda yangilanadi
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`receipts/draft/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); },
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`receipts/${id}`).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useOfflineSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (receipts: (CreateReceiptInput & { offlineId: string })[]) =>
      api.post('receipts/offline-sync', { json: { receipts } }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
