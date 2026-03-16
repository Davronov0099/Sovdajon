import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateKpiTemplateInput, CreateKpiAssignmentInput, CreateKpiRecordInput } from '@sardorbek/shared';
import type { ApiResponse, KpiTemplateItem, KpiAssignmentItem, KpiAssignmentWithProgress } from '@/types/api';

export function useKpiTemplates() {
  return useQuery<ApiResponse<KpiTemplateItem[]>>({
    queryKey: ['kpi', 'templates'],
    queryFn: () => api.get('kpi/templates').json<ApiResponse<KpiTemplateItem[]>>(),
    staleTime: 60_000,
  });
}

export function useCreateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKpiTemplateInput) => api.post('kpi/templates', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi', 'templates'] }); },
  });
}

export function useUpdateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CreateKpiTemplateInput> & { id: string }) =>
      api.patch(`kpi/templates/${id}`, { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi', 'templates'] }); },
  });
}

export function useDeleteKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`kpi/templates/${id}`).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi', 'templates'] }); },
  });
}

export function useKpiAssignments(query: { month?: string; userId?: string } = {}) {
  return useQuery<ApiResponse<KpiAssignmentItem[]>>({
    queryKey: ['kpi', 'assignments', query],
    queryFn: () => api.get('kpi/assignments', { searchParams: query as Record<string, string> }).json<ApiResponse<KpiAssignmentItem[]>>(),
    staleTime: 30_000,
  });
}

export function useCreateKpiAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKpiAssignmentInput) => api.post('kpi/assignments', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi', 'assignments'] }); },
  });
}

export function useKpiAssignmentRecords(assignmentId: string) {
  return useQuery<ApiResponse<KpiAssignmentWithProgress>>({
    queryKey: ['kpi', 'records', assignmentId],
    queryFn: () => api.get(`kpi/assignments/${assignmentId}/records`).json<ApiResponse<KpiAssignmentWithProgress>>(),
    enabled: !!assignmentId,
  });
}

export function useCreateKpiRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKpiRecordInput) => api.post('kpi/records', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi'] }); },
  });
}
