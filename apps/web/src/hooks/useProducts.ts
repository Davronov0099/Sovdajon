import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateProductInput } from '@sardorbek/shared';

interface Product {
  id: string;
  code: number | null;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  categoryId: string;
  subCategoryId: string | null;
  images: string[];
  description: string | null;
  category: { id: string; name: string };
  subCategory: { id: string; name: string } | null;
  createdAt: string;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  stockStatus?: string;
  priceStatus?: string;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.subCategoryId) params.set('subCategoryId', filters.subCategoryId);
      if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
      if (filters.priceStatus) params.set('priceStatus', filters.priceStatus);

      return api.get(`products?${params.toString()}`).json<ProductsResponse>();
    },
  });
}

interface InfiniteProductFilters {
  limit?: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  stockStatus?: string;
  priceStatus?: string;
}

export function useInfiniteProducts(filters: InfiniteProductFilters = {}) {
  const limit = filters.limit ?? 50;
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.subCategoryId) params.set('subCategoryId', filters.subCategoryId);
      if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
      if (filters.priceStatus) params.set('priceStatus', filters.priceStatus);

      return api.get(`products?${params.toString()}`).json<ProductsResponse>();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

interface ProductStats {
  total: number;
  lowStock: number;
  outOfStock: number;
  noPrice: number;
  totalValue: number;
}

export function useProductStats() {
  return useQuery({
    queryKey: ['products', 'stats'],
    queryFn: () => api.get('products/stats').json<{ success: boolean; data: ProductStats }>(),
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`products/${id}`).json<{ success: boolean; data: Product }>(),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) =>
      api.post('products', { json: data }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductInput> }) =>
      api.patch(`products/${id}`, { json: data }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`products/${id}`).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export interface BulkUpdateInput {
  ids: string[];
  data: Partial<CreateProductInput>;
}

export function useBulkUpdateProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkUpdateInput) =>
      api.patch('products/bulk', { json: input }).json<{ success: boolean; data: { updated: number; missingIds: string[] } }>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
