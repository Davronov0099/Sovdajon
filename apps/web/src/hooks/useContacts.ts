import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateContactInput, ContactImportInput } from '@sardorbek/shared';
import type { PaginatedApiResponse, ApiResponse, ContactItem, ContactCategoryItem } from '@/types/api';

interface ContactQuery {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

export function useContacts(query: ContactQuery = {}) {
  return useQuery<PaginatedApiResponse<ContactItem>>({
    queryKey: ['contacts', query],
    queryFn: () => api.get('contacts', { searchParams: query as Record<string, string> }).json<PaginatedApiResponse<ContactItem>>(),
    staleTime: 30_000,
  });
}

export function useInfiniteContacts(filters: { search?: string; categoryId?: string; limit?: number } = {}) {
  const limit = filters.limit ?? 50;
  return useInfiniteQuery({
    queryKey: ['contacts', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('page', String(pageParam));
      params.set('limit', String(limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      return api.get(`contacts?${params.toString()}`).json<PaginatedApiResponse<ContactItem>>();
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useContactCategories() {
  return useQuery<ApiResponse<ContactCategoryItem[]>>({
    queryKey: ['contact-categories'],
    queryFn: () => api.get('contacts/categories').json<ApiResponse<ContactCategoryItem[]>>(),
    staleTime: 60_000,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactInput) => api.post('contacts', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateContactInput> & { id: string }) =>
      api.patch(`contacts/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`contacts/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
}

export function useImportContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactImportInput) => api.post('contacts/import', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); },
  });
}

export function useCreateContactCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => api.post('contacts/categories', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-categories'] }); },
  });
}

export function useDeleteContactCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`contacts/categories/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contact-categories'] }); },
  });
}
