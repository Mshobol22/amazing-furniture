import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BEDROOM_MERGED_SLUG,
  BEDROOM_SOURCE_CATEGORIES,
} from "@/lib/collections/collection-scope";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const category = body.category as string | undefined;
    const discount = Number(body.discount);

    if (isNaN(discount) || discount <= 0 || discount >= 100) {
      return NextResponse.json(
        { error: "Invalid discount (must be 1-99)" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let query = admin.from("products").select("id, price");
    if (category && category !== "all") {
      if (category === BEDROOM_MERGED_SLUG) {
        query = query.in("category", [...BEDROOM_SOURCE_CATEGORIES]);
      } else {
        query = query.eq("category", category);
      }
    }

    const { data: products } = await query;

    let updated = 0;
    for (const p of products ?? []) {
      const price = Number(p.price);
      const salePrice = Math.round(price * (1 - discount / 100) * 100) / 100;
      const { error } = await admin
        .from("products")
        .update({ on_sale: true, sale_price: salePrice })
        .eq("id", p.id);
      if (!error) updated++;
    }

    return NextResponse.json({ updated });
  } catch (err) {
    console.error("Promotions apply error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
