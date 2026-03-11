import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: string[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
}

const useWishlistStoreBase = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (id) =>
        set((state) =>
          state.items.includes(id)
            ? state
            : { items: [...state.items, id] }
        ),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item !== id),
        })),

      toggleItem: (id) =>
        set((state) =>
          state.items.includes(id)
            ? { items: state.items.filter((item) => item !== id) }
            : { items: [...state.items, id] }
        ),

      isInWishlist: (id) => get().items.includes(id),

      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "wishlist-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

export const useWishlistStore = useWishlistStoreBase;
export const useWishlistCount = () =>
  useWishlistStoreBase((state) => state.items.length);
export const useIsInWishlist = (id: string) =>
  useWishlistStoreBase((state) => state.items.includes(id));
