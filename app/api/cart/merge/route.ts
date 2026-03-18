import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface CartItemPayload {
  product_id: string;
  quantity: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateItems(items: unknown): CartItemPayload[] | null {
  if (!Array.isArray(items)) return null;
  const valid: CartItemPayload[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const { product_id, quantity } = item as Record<string, unknown>;
    if (typeof product_id !== "string" || !UUID_RE.test(product_id))
      return null;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    )
      return null;
    valid.push({ product_id, quantity });
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

    // Merge: for same product_id, take the higher quantity
    const merged = new Map<string, number>();
    for (const item of savedItems) {
      merged.set(
        item.product_id,
        Math.max(merged.get(item.product_id) ?? 0, item.quantity)
      );
    }
    for (const item of guestItems) {
      merged.set(
        item.product_id,
        Math.max(merged.get(item.product_id) ?? 0, item.quantity)
      );
    }

    const mergedItems = Array.from(merged.entries()).map(
      ([product_id, quantity]) => ({ product_id, quantity })
    );

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

    // Fetch full product details for merged items so client can update store
    const productIds = mergedItems.map((i) => i.product_id);
    const { data: products } = await admin
      .from("products")
      .select("*")
      .in("id", productIds);

    const fullItems = mergedItems
      .map((item) => {
        const product = products?.find((p) => p.id === item.product_id);
        if (!product) return null;
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
