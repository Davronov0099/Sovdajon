import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavItem {
  key: string;
  visible: boolean;
}

// Default tartib
const DEFAULT_NAV: NavItem[] = [
  { key: 'dashboard', visible: true },
  { key: 'pos', visible: true },
  { key: 'products', visible: true },
  { key: 'categories', visible: true },
  { key: 'debts', visible: true },
  { key: 'customers', visible: true },
  { key: 'suppliers', visible: true },
  { key: 'expenses', visible: true },
  { key: 'hr', visible: true },
  { key: 'settings', visible: true },
  { key: 'helper', visible: true },
];

interface NavSettingsState {
  items: NavItem[];
  setItems: (items: NavItem[]) => void;
  toggleVisible: (key: string) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  resetToDefault: () => void;
}

export const useNavSettingsStore = create<NavSettingsState>()(
  persist(
    (set) => ({
      items: DEFAULT_NAV,
      setItems: (items) => set({ items }),
      toggleVisible: (key) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.key === key ? { ...item, visible: !item.visible } : item,
          ),
        })),
      moveItem: (fromIndex, toIndex) =>
        set((s) => {
          const items = [...s.items];
          const moved = items.splice(fromIndex, 1)[0];
          if (moved) items.splice(toIndex, 0, moved);
          return { items };
        }),
      resetToDefault: () => set({ items: DEFAULT_NAV }),
    }),
    {
      name: 'sardorbek-nav-settings',
      // Yangi key'lar qo'shilsa, eski persist'dan yo'qolmasligi uchun merge
      merge: (persisted, current) => {
        const p = persisted as Partial<NavSettingsState> | undefined;
        if (!p?.items) return current;
        // Barcha mavjud key'larni saqlab, yangilarini qo'shish
        const existingKeys = new Set(p.items.map((i) => i.key));
        const merged = [
          ...p.items,
          ...DEFAULT_NAV.filter((d) => !existingKeys.has(d.key)),
        ];
        return { ...current, items: merged };
      },
    },
  ),
);
