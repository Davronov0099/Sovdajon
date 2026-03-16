import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreatePartnerInput, PartnerPaymentInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, PartnerItem } from '@/types/api';

export function usePartners(query: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery<PaginatedApiResponse<PartnerItem>>({
    queryKey: ['partners', query],
    queryFn: () => api.get('partners', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<PartnerItem>>(),
    staleTime: 30_000,
  });
}

export function usePartner(id: string) {
  return useQuery<ApiResponse<PartnerItem & { payments: Array<{ id: string; amount: string; type: string; note: string | null; createdAt: string }> }>>({
    queryKey: ['partner', id],
    queryFn: () => api.get(`partners/${id}`).json(),
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartnerInput) => api.post('partners', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); },
  });
}

export function usePartnerPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ partnerId, ...data }: PartnerPaymentInput & { partnerId: string }) =>
      api.post(`partners/${partnerId}/payment`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partner'] });
    },
  });
}
