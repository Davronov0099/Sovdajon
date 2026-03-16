import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CheckInInput } from '@sardorbek/shared';
import type { ApiResponse } from '@/types/api';

interface AttendanceRecord {
  id: string;
  userId: string;
  checkIn: string;
  checkOut: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HALF_DAY';
  lat: number | null;
  lng: number | null;
  user: { id: string; name: string; role: string; avatar: string | null };
}

interface TodayData {
  records: AttendanceRecord[];
  stats: { total: number; present: number; late: number; checkedOut: number; absent: number };
  absentUsers: { id: string; name: string; role: string }[];
}

export function useTodayAttendance() {
  return useQuery<ApiResponse<TodayData>>({
    queryKey: ['attendance', 'today'],
    queryFn: () => api.get('attendance/today').json<ApiResponse<TodayData>>(),
    refetchInterval: 60_000,
  });
}

export function useUserAttendance(userId: string, month: string) {
  return useQuery({
    queryKey: ['attendance', 'user', userId, month],
    queryFn: () => api.get(`attendance/user/${userId}`, { searchParams: { month } }).json(),
    enabled: !!userId && !!month,
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CheckInInput) => api.post('attendance/check-in', { json: data }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('attendance/check-out', { json: {} }).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); },
  });
}
