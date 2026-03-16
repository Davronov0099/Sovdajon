import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateExpenseInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, ExpenseItem, ExpenseStats } from '@/types/api';

interface ExpenseQuery {
  page?: number;
  limit?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export function useExpenses(query: ExpenseQuery = {}) {
  return useQuery<PaginatedApiResponse<ExpenseItem>>({
    queryKey: ['expenses', query],
    queryFn: () => api.get('expenses', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<ExpenseItem>>(),
    staleTime: 30_000,
  });
}

export function useExpenseStats(startDate?: string, endDate?: string) {
  return useQuery<ApiResponse<ExpenseStats>>({
    queryKey: ['expenses', 'stats', startDate, endDate],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      return api.get('expenses/stats', { searchParams: params }).json<ApiResponse<ExpenseStats>>();
    },
    staleTime: 60_000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post('expenses', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateExpenseInput> & { id: string }) =>
      api.patch(`expenses/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`expenses/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); },
  });
}
