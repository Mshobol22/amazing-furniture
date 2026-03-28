import type { CartItem } from "@/types";

export const CART_SESSION_ID_KEY = "cart_session_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Persisted guest session for server-side cart rows (localStorage). */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(CART_SESSION_ID_KEY);
    if (id && UUID_RE.test(id)) return id;
    id = crypto.randomUUID();
    localStorage.setItem(CART_SESSION_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export function readSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(CART_SESSION_ID_KEY);
    return id && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function clearSessionId() {
  try {
    localStorage.removeItem(CART_SESSION_ID_KEY);
  } catch {
    // ignore
  }
}

export function cartItemsToPayload(
  items: CartItem[]
): { product_id: string; variant_id?: string; quantity: number }[] {
  return items.map((i) => ({
    product_id: i.product.id,
    variant_id: i.variant_id,
    quantity: i.quantity,
  }));
}
