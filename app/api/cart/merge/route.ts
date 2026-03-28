import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  validateCartItems,
  isValidSessionId,
  type CartItemPayload,
} from "@/lib/cart-payload";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const session_id = body?.session_id;
    const fromBody = validateCartItems(body?.guest_items);

    let guestItems: CartItemPayload[] = [];
    let guestRowId: string | null = null;

    if (isValidSessionId(session_id)) {
      const adminForGuest = createAdminClient();
      const { data: guestCart } = await adminForGuest
        .from("carts")
        .select("id, items")
        .eq("session_id", session_id)
        .is("user_id", null)
        .maybeSingle();

      if (guestCart?.id) {
        guestRowId = guestCart.id as string;
        if (guestCart.items && Array.isArray(guestCart.items)) {
          const validated = validateCartItems(guestCart.items);
          if (validated) guestItems = validated;
        }
      }
      if (guestItems.length === 0 && fromBody) {
        guestItems = fromBody;
      }
    } else {
      if (fromBody) guestItems = fromBody;
      else if (body?.guest_items != null) {
        return NextResponse.json(
          { error: "Invalid cart items" },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();

    const { data: existingCart } = await admin
      .from("carts")
      .select("id, items")
      .eq("user_id", user.id)
      .maybeSingle();

    const savedItems: CartItemPayload[] = [];
    if (existingCart?.items && Array.isArray(existingCart.items)) {
      const validated = validateCartItems(existingCart.items);
      if (validated) savedItems.push(...validated);
    }

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

    if (existingCart) {
      await admin
        .from("carts")
        .update({ items: mergedItems })
        .eq("id", existingCart.id);
    } else {
      await admin.from("carts").insert({ user_id: user.id, items: mergedItems });
    }

    if (guestRowId) {
      await admin.from("carts").delete().eq("id", guestRowId);
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
