import { createAdminClient } from "@/lib/supabase/admin";
import type { CartItemPayload } from "@/lib/cart-payload";
import type { CartItem, Product } from "@/types";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Merge duplicate lines (same product + variant) and clamp per-line qty to 99. */
export function dedupeCartLines(items: CartItemPayload[]): CartItemPayload[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const key = `${item.product_id}:${item.variant_id ?? ""}`;
    merged.set(key, Math.min(99, (merged.get(key) ?? 0) + item.quantity));
  }
  return Array.from(merged.entries()).map(([key, quantity]) => {
    const [product_id, variantKey] = key.split(":");
    return {
      product_id,
      variant_id: variantKey || undefined,
      quantity,
    };
  });
}

export function cartPayloadMetrics(items: CartItemPayload[]): {
  lineCount: number;
  totalQty: number;
} {
  return {
    lineCount: items.length,
    totalQty: items.reduce((s, i) => s + i.quantity, 0),
  };
}

/** B2C guard: values above this usually mean a merge bug or corrupted row. */
export const CART_ABUSE_MAX_LINES = 45;
export const CART_ABUSE_MAX_TOTAL_QTY = 200;

export function isAbusiveCartPayload(items: CartItemPayload[]): boolean {
  const m = cartPayloadMetrics(items);
  return m.lineCount > CART_ABUSE_MAX_LINES || m.totalQty > CART_ABUSE_MAX_TOTAL_QTY;
}

/**
 * Load products/variants, drop invalid/OOS lines, clamp quantities.
 * Returns the JSON-safe payload to store in `carts.items` and hydrated `CartItem[]` for the client.
 */
export async function resolveCartPayloadToStoredAndFull(
  admin: AdminClient,
  mergedItemsRaw: CartItemPayload[]
): Promise<{
  mergedItems: CartItemPayload[];
  fullItems: CartItem[];
}> {
  const productIds = Array.from(new Set(mergedItemsRaw.map((i) => i.product_id)));
  const variantIds = Array.from(
    new Set(
      mergedItemsRaw
        .map((i) => i.variant_id)
        .filter((id): id is string => typeof id === "string")
    )
  );

  const [{ data: products }, { data: variants }] = await Promise.all([
    admin.from("products").select("*").in("id", productIds),
    variantIds.length > 0
      ? admin
          .from("product_variants")
          .select(
            "id, product_id, sku, size, color, price, image_url, stock_qty, in_stock"
          )
          .in("id", variantIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const productMap = new Map((products ?? []).map((p) => [p.id as string, p]));
  const variantMap = new Map((variants ?? []).map((v) => [v.id as string, v]));

  const mergedItems = mergedItemsRaw
    .map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) return null;

      if (item.variant_id) {
        const variant = variantMap.get(item.variant_id);
        if (!variant || variant.product_id !== item.product_id) return null;
        if (!variant.in_stock) return null;
        const clampedQty = Math.max(
          1,
          Math.min(item.quantity, Number(variant.stock_qty) || 99, 99)
        );
        return {
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: clampedQty,
        };
      }

      if (!product.in_stock) return null;
      return {
        product_id: item.product_id,
        quantity: Math.max(1, Math.min(item.quantity, 99)),
      };
    })
    .filter((item): item is CartItemPayload => Boolean(item));

  const fullItems: CartItem[] = [];
  for (const item of mergedItems) {
    const product = productMap.get(item.product_id) as Product | undefined;
    if (!product) continue;

    if (item.variant_id) {
      const variant = variantMap.get(item.variant_id);
      if (!variant) continue;
      fullItems.push({
        product,
        quantity: item.quantity,
        variant_id: variant.id as string,
        variant_sku: (variant.sku as string) ?? undefined,
        variant_size: variant.size != null ? String(variant.size) : undefined,
        variant_color: variant.color != null ? String(variant.color) : undefined,
        variant_price:
          typeof variant.price === "number" ? variant.price : undefined,
        variant_image:
          variant.image_url != null ? String(variant.image_url) : undefined,
      });
    } else {
      fullItems.push({ product, quantity: item.quantity });
    }
  }

  return { mergedItems, fullItems };
}
