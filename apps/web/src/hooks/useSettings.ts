import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('settings').json<{ success: boolean; data: Record<string, string> }>(),
  });
}

export function useCurrencyRate() {
  return useQuery({
    queryKey: ['settings', 'currency'],
    queryFn: () => api.get('settings/currency').json<{ success: boolean; data: { rate: number } }>(),
  });
}

export function useUpdateCurrencyRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rate: number) => api.patch('settings/currency', { json: { rate } }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); },
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`settings/${key}`, { json: { value } }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); },
  });
}
