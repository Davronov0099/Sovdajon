import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Bugungi sana — YYYY-MM-DD (local) */
export function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Timezone-safe: tanlangan local kun chegaralarini aniq UTC instant sifatida */
export function dayStartISO(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).toISOString();
}
export function dayEndISO(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999).toISOString();
}

interface DashboardFilterState {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  setFrom: (d: string) => void;
  setTo: (d: string) => void;
  setRange: (from: string, to: string) => void;
  resetToday: () => void;
}

/**
 * Dashboard sana filtri — localStorage'da doimiy saqlanadi.
 * Tab'lar oralig'ida va detail page'larga o'tganda ham saqlanib turadi.
 */
export const useDashboardFilter = create<DashboardFilterState>()(
  persist(
    (set) => ({
      from: todayStr(),
      to: todayStr(),
      setFrom: (from) => set({ from }),
      setTo: (to) => set({ to }),
      setRange: (from, to) => set({ from, to }),
      resetToday: () => {
        const t = todayStr();
        set({ from: t, to: t });
      },
    }),
    { name: 'sovdajon-dashboard-filter' },
  ),
);
