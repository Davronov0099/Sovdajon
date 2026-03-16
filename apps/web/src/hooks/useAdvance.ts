import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateAdvanceInput } from '@sardorbek/shared';

export function useAdvances(query: { status?: string; userId?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['advances', query],
    queryFn: () => api.get('advances', { searchParams: query as Record<string, string> }).json(),
    staleTime: 30_000,
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAdvanceInput) => api.post('advances', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); },
  });
}

export function useApproveAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`advances/${id}/approve`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); },
  });
}

export function useRejectAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`advances/${id}/reject`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advances'] }); },
  });
}
