import { NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: products } = await admin
      .from("products")
      .select("id")
      .eq("on_sale", true);

    let updated = 0;
    for (const p of products ?? []) {
      const { error } = await admin
        .from("products")
        .update({ on_sale: false, sale_price: null })
        .eq("id", p.id);
      if (!error) updated++;
    }

    return NextResponse.json({ updated });
  } catch (err) {
    console.error("Promotions end-all error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
