import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UsdRateState {
  rate: number;
  setRate: (rate: number) => void;
}

export const useUsdRateStore = create<UsdRateState>()(
  persist(
    (set) => ({
      rate: 13000,
      setRate: (rate) => set({ rate: Math.max(0, rate) }),
    }),
    { name: 'sardorbek-usd-rate' },
  ),
);
