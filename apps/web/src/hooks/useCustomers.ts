import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useInfiniteCustomers(filters: { search?: string; categoryId?: string; limit?: number } = {}) {
  const limit = filters.limit ?? 50;
  return useInfiniteQuery({
    queryKey: ['customers', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      return api.get(`customers?${params.toString()}`).json<PaginatedApiResponse<CustomerItem>>();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
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
  startDate?: string;
  categoryId?: string | null;
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

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateCustomerInput> & { id: string }) =>
      api.patch(`customers/${id}`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`customers/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); },
  });
}
