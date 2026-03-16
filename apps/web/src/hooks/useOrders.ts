import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateOrderInput, UpdateOrderStatusInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, OrderItem } from '@/types/api';

interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function useOrders(query: OrderQuery = {}) {
  return useQuery<PaginatedApiResponse<OrderItem>>({
    queryKey: ['orders', query],
    queryFn: () => api.get('orders', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<OrderItem>>(),
    staleTime: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery<ApiResponse<OrderItem>>({
    queryKey: ['order', id],
    queryFn: () => api.get(`orders/${id}`).json<ApiResponse<OrderItem>>(),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOrderInput) => api.post('orders', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateOrderStatusInput & { id: string }) =>
      api.patch(`orders/${id}/status`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`orders/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); },
  });
}
