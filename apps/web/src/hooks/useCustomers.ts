import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { PaginatedApiResponse, CustomerItem } from '@/types/api';

interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  debtLimit: string | null;
  loyaltyPoints: number;
}

export function useCustomerSearch(q: string) {
  return useQuery({
    queryKey: ['customers', 'search', q],
    queryFn: () =>
      api
        .get('customers/search', { searchParams: { q } })
        .json<{ success: true; data: CustomerSearchResult[] }>(),
    enabled: q.length >= 2,
    staleTime: 10_000,
  });
}

export function useCustomers(query: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery<PaginatedApiResponse<CustomerItem>>({
    queryKey: ['customers', query],
    queryFn: () =>
      api.get('customers', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<CustomerItem>>(),
    staleTime: 30_000,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () =>
      api.get(`customers/${id}`).json<{ success: true; data: unknown }>(),
    enabled: !!id,
  });
}

interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  debtLimit?: number;
  note?: string;
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      api.post('customers', { json: data }).json<{ success: true; data: CustomerSearchResult }>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
