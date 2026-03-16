import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateWarehouseInput } from '@sardorbek/shared';
import type { ApiResponse, WarehouseItem } from '@/types/api';

export function useWarehouses() {
  return useQuery<ApiResponse<WarehouseItem[]>>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('warehouses').json<ApiResponse<WarehouseItem[]>>(),
    staleTime: 60_000,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWarehouseInput) => api.post('warehouses', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateWarehouseInput> & { id: string }) =>
      api.patch(`warehouses/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); },
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`warehouses/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['warehouses'] }); },
  });
}
