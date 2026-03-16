import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateDebtInput, DebtPaymentInput, DebtExtendInput } from '@sardorbek/shared';
import type { DebtListResponse, ApiResponse, DebtItem, DebtStats } from '@/types/api';

interface DebtQuery {
  page?: number;
  limit?: number;
  status?: string;
  customerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useDebts(query: DebtQuery = {}) {
  return useQuery<DebtListResponse>({
    queryKey: ['debts', query],
    queryFn: () => api.get('debts', { searchParams: query as Record<string, string> }).json<DebtListResponse>(),
    staleTime: 30_000,
  });
}

export function useDebt(id: string) {
  return useQuery<ApiResponse<DebtItem>>({
    queryKey: ['debt', id],
    queryFn: () => api.get(`debts/${id}`).json<ApiResponse<DebtItem>>(),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useDebtStats() {
  return useQuery<ApiResponse<DebtStats>>({
    queryKey: ['debts', 'stats'],
    queryFn: () => api.get('debts/stats').json<ApiResponse<DebtStats>>(),
    staleTime: 60_000,
  });
}

export function useCreateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDebtInput) => api.post('debts', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); },
  });
}

export function useDebtPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, ...data }: DebtPaymentInput & { debtId: string }) =>
      api.post(`debts/${debtId}/payment`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['debt'] });
    },
  });
}

export function useDebtExtend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, ...data }: DebtExtendInput & { debtId: string }) =>
      api.post(`debts/${debtId}/extend`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['debt'] });
    },
  });
}
