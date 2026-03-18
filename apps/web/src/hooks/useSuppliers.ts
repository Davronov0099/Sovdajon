import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateSupplierInput, SupplierImportInput, SupplierPaymentInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, SupplierItem } from '@/types/api';

export function useSuppliers(query: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery<PaginatedApiResponse<SupplierItem>>({
    queryKey: ['suppliers', query],
    queryFn: () => api.get('suppliers', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<SupplierItem>>(),
    staleTime: 30_000,
  });
}

export function useInfiniteSuppliers(filters: { search?: string; limit?: number } = {}) {
  const limit = filters.limit ?? 50;
  return useInfiniteQuery({
    queryKey: ['suppliers', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(limit));
      if (filters.search) params.set('search', filters.search);
      return api.get(`suppliers?${params.toString()}`).json<PaginatedApiResponse<SupplierItem>>();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useSupplier(id: string) {
  return useQuery<ApiResponse<SupplierItem>>({
    queryKey: ['supplier', id],
    queryFn: () => api.get(`suppliers/${id}`).json<ApiResponse<SupplierItem>>(),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierInput) => api.post('suppliers', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateSupplierInput> & { id: string }) =>
      api.patch(`suppliers/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); },
  });
}

export function useSupplierImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, ...data }: SupplierImportInput & { supplierId: string }) =>
      api.post(`suppliers/${supplierId}/import`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, ...data }: SupplierPaymentInput & { supplierId: string }) =>
      api.post(`suppliers/${supplierId}/payment`, { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['supplier'] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`suppliers/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); },
  });
}
