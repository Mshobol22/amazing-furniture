import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateCartItems } from "@/lib/cart-payload";
import {
  dedupeCartLines,
  isAbusiveCartPayload,
  resolveCartPayloadToStoredAndFull,
} from "@/lib/cart-resolve";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET current user's cart from DB, deduped and hydrated.
 * Resets server cart to [] if payload is invalid or exceeds abuse thresholds (merge-bug recovery).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: existingCart } = await admin
      .from("carts")
      .select("id, items")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingCart?.id) {
      return NextResponse.json({ items: [] });
    }

    const raw = existingCart.items;
    if (!raw || !Array.isArray(raw)) {
      await admin.from("carts").update({ items: [] }).eq("id", existingCart.id);
      return NextResponse.json({ items: [], cart_reset: true });
    }

    const validated = validateCartItems(raw);
    if (!validated) {
      await admin.from("carts").update({ items: [] }).eq("id", existingCart.id);
      return NextResponse.json({ items: [], cart_reset: true });
    }

    const deduped = dedupeCartLines(validated);
    if (isAbusiveCartPayload(deduped)) {
      await admin.from("carts").update({ items: [] }).eq("id", existingCart.id);
      return NextResponse.json({ items: [], cart_reset: true });
    }

    const { mergedItems, fullItems } = await resolveCartPayloadToStoredAndFull(
      admin,
      deduped
    );

    await admin
      .from("carts")
      .update({ items: mergedItems })
      .eq("id", existingCart.id);

    return NextResponse.json({ items: fullItems });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
