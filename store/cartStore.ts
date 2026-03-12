import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";

export const getEffectivePrice = (p: Product) =>
  p.on_sale && p.sale_price != null ? p.sale_price : p.price;

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const useCartStoreBase = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [...state.items, { product, quantity }],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => item.product.id !== productId),
            };
          }
          return {
            items: state.items.map((item) =>
              item.product.id === productId ? { ...item, quantity } : item
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Computed selectors
export const useCartTotal = () =>
  useCartStoreBase((state) =>
    state.items.reduce(
      (sum, item) => sum + getEffectivePrice(item.product) * item.quantity,
      0
    )
  );

export const useCartItemCount = () =>
  useCartStoreBase((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );

const useCartStore = useCartStoreBase;
export default useCartStore;
export { useCartStore };
