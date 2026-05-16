import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NavItem {
  key: string;
  visible: boolean;
}

// Tozalanishi kerak bo'lgan eski key'lar (warehouses olib tashlandi)
const REMOVED_KEYS = new Set(['warehouses', 'marketplace-settings']);

// Default tartib — Arxiv guruhga ko'chirilganlar ham bu yerda (mavjud bo'lishi shart),
// lekin sidebar/topnav filter qiladi (ARCHIVE_KEYS bo'yicha)
const DEFAULT_NAV: NavItem[] = [
  { key: 'dashboard', visible: true },
  { key: 'pos', visible: true },
  { key: 'products', visible: true },
  { key: 'categories', visible: true },
  { key: 'debts', visible: true },
  { key: 'customers', visible: true },
  { key: 'prospecting', visible: true },
  { key: 'suppliers', visible: true },
  { key: 'expenses', visible: true },
  { key: 'archive', visible: true },
  // Arxiv ichidagilar (sidebar'da chiqmaydi, lekin metadata uchun kerak):
  { key: 'hr', visible: true },
  { key: 'settings', visible: true },
  { key: 'helper', visible: true },
  { key: 'orders', visible: true },
  { key: 'receipts', visible: true },
  { key: 'stock-alerts', visible: true },
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
      merge: (persisted, current) => {
        const p = persisted as Partial<NavSettingsState> | undefined;
        if (!p?.items) return current;
        // 1) Eski/olib tashlangan key'larni filtrlash
        const cleaned = p.items.filter((i) => !REMOVED_KEYS.has(i.key));
        // 2) Yangi default key'larni qo'shish
        const existingKeys = new Set(cleaned.map((i) => i.key));
        const merged = [
          ...cleaned,
          ...DEFAULT_NAV.filter((d) => !existingKeys.has(d.key)),
        ];
        return { ...current, items: merged };
      },
    },
  ),
);
