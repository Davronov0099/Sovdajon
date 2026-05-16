import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('settings').json<{ success: boolean; data: Record<string, string> }>(),
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
