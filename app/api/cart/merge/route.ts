import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  validateCartItems,
  isValidSessionId,
  type CartItemPayload,
} from "@/lib/cart-payload";
import { resolveCartPayloadToStoredAndFull } from "@/lib/cart-resolve";
import { NextResponse } from "next/server";

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

    const { mergedItems, fullItems } = await resolveCartPayloadToStoredAndFull(
      admin,
      mergedItemsRaw
    );

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

    return NextResponse.json({ items: fullItems });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
