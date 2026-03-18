import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateUserInput, UpdateUserInput } from '@sardorbek/shared';

export interface UserItem {
  id: string;
  login: string;
  name: string;
  role: 'ADMIN' | 'CASHIER' | 'HELPER';
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('users').json<{ success: boolean; data: UserItem[] }>(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserInput) => api.post('users', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateUserInput & { id: string }) =>
      api.patch(`users/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`users/${id}`).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['salaries'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.post(`users/${id}/reset-password`, { json: { password } }).json(),
  });
}
