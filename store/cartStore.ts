import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductVariant } from "@/types";

export const getEffectivePrice = (p: Product) =>
  p.on_sale && p.sale_price != null ? p.sale_price : p.price;

export const getCartItemPrice = (item: CartItem) =>
  item.variant_price ?? getEffectivePrice(item.product);

const GUEST_CART_KEY = "guest_cart";

/** Validate a single cart item before restoring from localStorage */
function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  if (!obj.product || typeof obj.product !== "object") return false;
  const prod = obj.product as Record<string, unknown>;
  // product_id must be UUID format
  if (
    typeof prod.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      prod.id
    )
  )
    return false;
  if (typeof prod.price !== "number" || prod.price <= 0) return false;
  // quantity must be positive integer, max 99
  if (
    typeof obj.quantity !== "number" ||
    !Number.isInteger(obj.quantity) ||
    obj.quantity < 1 ||
    obj.quantity > 99
  )
    return false;
  return true;
}

/** Write validated items to guest_cart localStorage */
function saveGuestCart(items: CartItem[]) {
  try {
    const slim = items.map((i) => ({
      product: i.product,
      quantity: i.quantity,
    }));
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(slim));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Read and validate guest_cart from localStorage */
export function readGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartItem);
  } catch {
    return [];
  }
}

export function clearGuestCart() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  addVariantItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
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
            (item) => item.product.id === product.id && !item.variant_id
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && !item.variant_id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [...state.items, { product, quantity }],
          };
        }),

      addVariantItem: (product, variant, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (item) => item.product.id === product.id && item.variant_id === variant.id
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && item.variant_id === variant.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                product,
                quantity,
                variant_id: variant.id,
                variant_sku: variant.sku,
                variant_size: variant.size ?? undefined,
                variant_color: variant.color ?? undefined,
                variant_price: variant.price,
                variant_image: variant.image_url ?? undefined,
              },
            ],
          };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((item) =>
            variantId
              ? !(item.product.id === productId && item.variant_id === variantId)
              : !(item.product.id === productId && !item.variant_id)
          ),
        })),

      updateQuantity: (productId, quantity, variantId) =>
        set((state) => {
          const matchFn = (item: CartItem) =>
            variantId
              ? item.product.id === productId && item.variant_id === variantId
              : item.product.id === productId && !item.variant_id;
          if (quantity <= 0) {
            return { items: state.items.filter((item) => !matchFn(item)) };
          }
          return {
            items: state.items.map((item) =>
              matchFn(item) ? { ...item, quantity } : item
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      setItems: (items: CartItem[]) => set({ items }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// Sync cart → guest_cart localStorage on every change
useCartStoreBase.subscribe((state) => {
  if (typeof window !== "undefined") {
    saveGuestCart(state.items);
  }
});

// Computed selectors
export const useCartTotal = () =>
  useCartStoreBase((state) =>
    state.items.reduce(
      (sum, item) => sum + getCartItemPrice(item) * item.quantity,
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
