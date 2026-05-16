import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateReturnInput } from '@sardorbek/shared';

export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReturnInput) => api.post('returns', { json: data }).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
