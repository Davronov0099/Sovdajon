import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  unit: string;
  stock: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;

  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updatePrice: (productId: string, price: number) => void;
  setCustomer: (id: string, name: string) => void;
  clearCustomer: () => void;
  clearCart: () => void;

  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      customerName: null,

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          // Oxirgi qo'shilgan yuqorida ko'rinadi
          return {
            items: [{ ...product, quantity: 1 }, ...state.items],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        })),

      updatePrice: (productId, price) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, price: Math.max(0, price) } : i,
          ),
        })),

      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      clearCustomer: () => set({ customerId: null, customerName: null }),

      clearCart: () =>
        set({ items: [], customerId: null, customerName: null }),

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTotal: () => {
        return get().getSubtotal();
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'sardorbek-cart',
      version: 2,
      // v0/v1 → v2: chegirma fieldlari olib tashlandi
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        if (Array.isArray(state.items)) {
          state.items = (state.items as Array<Record<string, unknown>>).map((item) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { discount, discountTiers, ...rest } = item;
            return rest as unknown as CartItem;
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { globalDiscount, ...cleaned } = state;
        return cleaned as unknown as CartState;
      },
    },
  ),
);
