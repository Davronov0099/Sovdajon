import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CustomerCategoryItem } from '@/types/api';

interface CustomerCategoriesResponse {
  success: boolean;
  data: CustomerCategoryItem[];
}

export function useCustomerCategories() {
  return useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => api.get('customers/categories').json<CustomerCategoriesResponse>(),
  });
}

export function useCreateCustomerCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      api.post('customers/categories', { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-categories'] });
    },
  });
}

export function useUpdateCustomerCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(`customers/categories/${id}`, { json: { name } }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-categories'] });
    },
  });
}

export function useDeleteCustomerCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`customers/categories/${id}`).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-categories'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
