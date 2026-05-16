import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ApiResponse, PaginatedApiResponse, OrderEntity, OrderStatusType } from '@/types/api';

export interface CreateOrderInput {
  customerId?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  note?: string;
}

export function useOrders(filters: { status?: OrderStatusType | ''; search?: string; page?: number; limit?: number } = {}) {
  return useQuery<PaginatedApiResponse<OrderEntity>>({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 50));
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      return api.get(`orders?${params.toString()}`).json<PaginatedApiResponse<OrderEntity>>();
    },
    refetchInterval: 15_000, // Real-time updates
  });
}

export function useOrder(id: string) {
  return useQuery<ApiResponse<OrderEntity>>({
    queryKey: ['order', id],
    queryFn: () => api.get(`orders/${id}`).json<ApiResponse<OrderEntity>>(),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) => api.post('orders', { json: data }).json<ApiResponse<OrderEntity>>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatusType }) =>
      api.patch(`orders/${id}/status`, { json: { status } }).json<ApiResponse<OrderEntity>>(),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', variables.id] });
    },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`orders/${id}`).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
