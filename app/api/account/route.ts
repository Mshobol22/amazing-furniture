import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Account deletion: anonymize orders (retain records), remove cart/wishlist/profile, delete auth user.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    const admin = createAdminClient();

    const { error: orderErr } = await admin
      .from("orders")
      .update({ user_id: null })
      .eq("user_id", userId);
    if (orderErr) {
      console.error("[api/account] orders anonymize:", orderErr.message);
      return NextResponse.json({ error: "Failed to update orders" }, { status: 500 });
    }

    const { error: cartErr } = await admin.from("carts").delete().eq("user_id", userId);
    if (cartErr) {
      console.warn("[api/account] carts delete:", cartErr.message);
    }

    await admin.from("wishlists").delete().eq("user_id", userId);

    const { error: profileErr } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profileErr) {
      console.error("[api/account] profile delete:", profileErr.message);
    }

    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error("[api/account] auth delete:", authErr.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/account]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
