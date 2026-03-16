import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ApiResponse } from '@/types/api';

interface SalaryItem {
  id: string;
  userId: string;
  month: string;
  base: string;
  kpiBonus: string;
  salesBonus: string;
  advances: string;
  fines: string;
  total: string;
  status: 'DRAFT' | 'CALCULATED' | 'RECALCULATED' | 'PAID';
  paidAt: string | null;
  user: { id: string; name: string; role: string };
}

export function useSalaries(month: string) {
  return useQuery<ApiResponse<SalaryItem[]>>({
    queryKey: ['salary', month],
    queryFn: () => api.get('salary', { searchParams: { month } }).json<ApiResponse<SalaryItem[]>>(),
    enabled: !!month,
    staleTime: 30_000,
  });
}

export function useCalculateAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => api.post('salary/calculate-all', { json: { month } }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary'] }); },
  });
}

export function usePaySalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`salary/${id}/pay`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary'] }); },
  });
}

export function useCancelSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`salary/${id}/cancel`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary'] }); },
  });
}

export function useSalarySetting(userId: string) {
  return useQuery({
    queryKey: ['salary-setting', userId],
    queryFn: () => api.get(`salary/settings/${userId}`).json(),
    enabled: !!userId,
  });
}

export function useUpsertSalarySetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; baseSalary: number; salesPercent: number }) =>
      api.post('salary/settings', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-setting'] }); },
  });
}
