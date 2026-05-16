import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MarketplaceCartItem {
  productId: string;
  name: string;
  image: string | null;
  priceUzs: number;
  quantity: number;
}

interface MarketplaceState {
  cart: MarketplaceCartItem[];
  addToCart: (item: Omit<MarketplaceCartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      cart: [],

      addToCart: (item) => {
        const { cart } = get();
        const existing = cart.find((c) => c.productId === item.productId);
        if (existing) {
          set({
            cart: cart.map((c) =>
              c.productId === item.productId ? { ...c, quantity: c.quantity + 1 } : c,
            ),
          });
        } else {
          set({ cart: [...cart, { ...item, quantity: 1 }] });
        }
      },

      removeFromCart: (productId) => {
        set({ cart: get().cart.filter((c) => c.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set({
          cart: get().cart.map((c) =>
            c.productId === productId ? { ...c, quantity } : c,
          ),
        });
      },

      clearCart: () => set({ cart: [] }),

      getCartTotal: () =>
        get().cart.reduce((sum, c) => sum + c.priceUzs * c.quantity, 0),

      getCartCount: () =>
        get().cart.reduce((sum, c) => sum + c.quantity, 0),
    }),
    { name: 'sovdajon-marketplace-cart' },
  ),
);
