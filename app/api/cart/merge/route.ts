import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CartItemPayload {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateItems(items: unknown): CartItemPayload[] | null {
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

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const guestItems = validateItems(body.guest_items);
    if (!guestItems) {
      return NextResponse.json(
        { error: "Invalid cart items" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch existing saved cart for this user
    const { data: existingCart } = await admin
      .from("carts")
      .select("id, items")
      .eq("user_id", user.id)
      .single();

    const savedItems: CartItemPayload[] = [];
    if (existingCart?.items && Array.isArray(existingCart.items)) {
      const validated = validateItems(existingCart.items);
      if (validated) savedItems.push(...validated);
    }

    // Merge by product + variant. Sum quantities, then clamp server-side.
    const merged = new Map<string, number>();
    for (const item of savedItems) {
      const key = `${item.product_id}:${item.variant_id ?? ""}`;
      merged.set(key, (merged.get(key) ?? 0) + item.quantity);
    }
    for (const item of guestItems) {
      const key = `${item.product_id}:${item.variant_id ?? ""}`;
      merged.set(key, (merged.get(key) ?? 0) + item.quantity);
    }

    const mergedItemsRaw = Array.from(merged.entries()).map(([key, quantity]) => {
      const [product_id, variantKey] = key.split(":");
      return {
        product_id,
        variant_id: variantKey || undefined,
        quantity: Math.min(quantity, 99),
      };
    });

    const productIds = Array.from(new Set(mergedItemsRaw.map((i) => i.product_id)));
    const variantIds = Array.from(
      new Set(
        mergedItemsRaw
          .map((i) => i.variant_id)
          .filter((id): id is string => typeof id === "string")
      )
    );

    // Never trust client cart prices. Re-hydrate from DB and enforce stock.
    const [{ data: products }, { data: variants }] = await Promise.all([
      admin.from("products").select("*").in("id", productIds),
      variantIds.length > 0
        ? admin
            .from("product_variants")
            .select("id, product_id, sku, size, color, price, image_url, stock_qty, in_stock")
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

    // Upsert merged cart to Supabase
    if (existingCart) {
      await admin
        .from("carts")
        .update({ items: mergedItems })
        .eq("id", existingCart.id);
    } else {
      await admin
        .from("carts")
        .insert({ user_id: user.id, items: mergedItems });
    }

    const fullItems = mergedItems
      .map((item) => {
        const product = productMap.get(item.product_id);
        if (!product) return null;

        if (item.variant_id) {
          const variant = variantMap.get(item.variant_id);
          if (!variant) return null;
          return {
            product,
            quantity: item.quantity,
            variant_id: variant.id,
            variant_sku: variant.sku ?? undefined,
            variant_size: variant.size ?? undefined,
            variant_color: variant.color ?? undefined,
            variant_price: typeof variant.price === "number" ? variant.price : undefined,
            variant_image: variant.image_url ?? undefined,
          };
        }

        return { product, quantity: item.quantity };
      })
      .filter(Boolean);

    return NextResponse.json({ items: fullItems });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
