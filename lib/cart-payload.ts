/** Shared cart line validation for guest sync and merge APIs */

export interface CartItemPayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function validateCartItems(items: unknown): CartItemPayload[] | null {
  if (!Array.isArray(items)) return null;
  const valid: CartItemPayload[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const { product_id, variant_id, quantity } = item as Record<string, unknown>;
    if (typeof product_id !== "string" || !UUID_RE.test(product_id))
      return null;
    if (
      variant_id != null &&
      (typeof variant_id !== "string" || !UUID_RE.test(variant_id))
    )
      return null;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    )
      return null;
    valid.push({
      product_id,
      variant_id: typeof variant_id === "string" ? variant_id : undefined,
      quantity,
    });
  }
  return valid;
}
