import { createAdminClient } from "@/lib/supabase/admin";
import { validateCartItems, isValidSessionId } from "@/lib/cart-payload";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Upsert a guest cart row keyed by session_id (no auth).
 * Used so POST /api/cart/merge can load the guest cart server-side after login.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session_id = body?.session_id;
    if (!isValidSessionId(session_id)) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const items = validateCartItems(body?.items);
    if (!items) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("carts")
      .select("id")
      .eq("session_id", session_id)
      .is("user_id", null)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("carts")
        .update({ items })
        .eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: "Failed to save cart" }, { status: 500 });
      }
    } else {
      const { error } = await admin.from("carts").insert({
        session_id,
        user_id: null,
        items,
      });
      if (error) {
        return NextResponse.json({ error: "Failed to save cart" }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
