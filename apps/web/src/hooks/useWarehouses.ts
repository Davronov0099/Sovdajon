import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type {
  ApiResponse,
  PaginatedApiResponse,
  WarehouseItem,
  WarehouseDetail,
  WarehouseStockItem,
  StockMovementItem,
} from '@/types/api';
import type {
  CreateWarehouseInput,
  WarehouseIssueInput,
  WarehouseTransferInput,
} from '@sardorbek/shared';

/* ─── LIST ─── */
export function useWarehouses() {
  return useQuery<ApiResponse<WarehouseItem[]>>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('warehouses').json<ApiResponse<WarehouseItem[]>>(),
    staleTime: 60_000,
  });
}

/* ─── DETAIL ─── */
export function useWarehouseDetail(id: string) {
  return useQuery<ApiResponse<WarehouseDetail>>({
    queryKey: ['warehouse', id],
    queryFn: () => api.get(`warehouses/${id}`).json<ApiResponse<WarehouseDetail>>(),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/* ─── PRODUCTS in warehouse ─── */
export function useWarehouseProducts(
  warehouseId: string,
  filters: { search?: string; categoryId?: string; page?: number; limit?: number } = {},
) {
  return useQuery<PaginatedApiResponse<WarehouseStockItem>>({
    queryKey: ['warehouse-products', warehouseId, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      return api.get(`warehouses/${warehouseId}/products?${params.toString()}`).json<PaginatedApiResponse<WarehouseStockItem>>();
    },
    enabled: !!warehouseId,
    staleTime: 15_000,
  });
}

/* ─── MOVEMENTS history ─── */
export function useWarehouseMovements(
  warehouseId: string,
  filters: { type?: string; page?: number; limit?: number } = {},
) {
  return useQuery<PaginatedApiResponse<StockMovementItem>>({
    queryKey: ['warehouse-movements', warehouseId, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.type) params.set('type', filters.type);
      return api.get(`warehouses/${warehouseId}/movements?${params.toString()}`).json<PaginatedApiResponse<StockMovementItem>>();
    },
    enabled: !!warehouseId,
    staleTime: 15_000,
  });
}

/* ─── CRUD mutations ─── */
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/* ─── ISSUE (Chiqim → Do'kon) ─── */
export function useIssueWarehouseStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseId, ...data }: WarehouseIssueInput & { warehouseId: string }) =>
      api.post(`warehouses/${warehouseId}/issue`, { json: data }).json(),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['warehouse', variables.warehouseId] });
      qc.invalidateQueries({ queryKey: ['warehouse-products', variables.warehouseId] });
      qc.invalidateQueries({ queryKey: ['warehouse-movements', variables.warehouseId] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/* ─── TRANSFER (Ombor → Ombor) ─── */
export function useTransferWarehouseStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseId, ...data }: WarehouseTransferInput & { warehouseId: string }) =>
      api.post(`warehouses/${warehouseId}/transfer`, { json: data }).json(),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['warehouse'] });
      qc.invalidateQueries({ queryKey: ['warehouse-products'] });
      qc.invalidateQueries({ queryKey: ['warehouse-movements'] });
      qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}
