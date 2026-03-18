import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface SubCategory {
  id: string;
  name: string;
  categoryId: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  subCategories: SubCategory[];
  _count: { products: number };
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('categories').json<CategoriesResponse>(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; icon?: string }) =>
      api.post('categories', { json: data }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; icon?: string } }) =>
      api.patch(`categories/${id}`, { json: data }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`categories/${id}`).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; order: number }[]) =>
      api.put('categories/reorder', { json: { items } }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; categoryId: string }) =>
      api.post('categories/sub', { json: data }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      api.patch(`categories/sub/${id}`, { json: data }).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteSubCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`categories/sub/${id}`).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
