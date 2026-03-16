import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateAutoDiscount } from '@sardorbek/shared';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  discount: number;
  unit: string;
  stock: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  globalDiscount: number;

  addItem: (product: Omit<CartItem, 'quantity' | 'discount'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  setCustomer: (id: string, name: string) => void;
  clearCustomer: () => void;
  clearCart: () => void;

  getRawSubtotal: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      customerName: null,
      globalDiscount: 0,

      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.productId
                  ? {
                      ...i,
                      quantity: i.quantity + 1,
                      discount: calculateAutoDiscount(i.quantity + 1),
                    }
                  : i,
              ),
            };
          }
          // Oxirgi qo'shilgan yuqorida ko'rinadi
          return {
            items: [
              { ...product, quantity: 1, discount: 0 },
              ...state.items,
            ],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity, discount: calculateAutoDiscount(quantity) }
              : i,
          ),
        })),

      updateDiscount: (productId, discount) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, discount } : i,
          ),
        })),

      setGlobalDiscount: (discount) => set({ globalDiscount: discount }),

      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      clearCustomer: () => set({ customerId: null, customerName: null }),

      clearCart: () =>
        set({ items: [], customerId: null, customerName: null, globalDiscount: 0 }),

      // Chegirmasiz jami (faqat narx × miqdor)
      getRawSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      // Item-level auto-discount qo'llanilgan subtotal
      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const lineTotal = item.price * item.quantity;
          const lineDiscount = Math.round(lineTotal * (item.discount / 100));
          return sum + (lineTotal - lineDiscount);
        }, 0);
      },

      // Global discount — subtotal (item discount qo'llanilgan) dan hisoblanadi
      getDiscountAmount: () => {
        const subtotal = get().getSubtotal();
        return Math.round(subtotal * (get().globalDiscount / 100));
      },

      getTotal: () => {
        return get().getSubtotal() - get().getDiscountAmount();
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'sardorbek-cart',
    },
  ),
);
