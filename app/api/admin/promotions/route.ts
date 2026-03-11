import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("products")
      .select("category, sale_price, price, on_sale")
      .eq("on_sale", true);

    const byCategory = new Map<string, { count: number; discount: number }>();
    (data ?? []).forEach((p) => {
      const price = Number(p.price);
      const salePrice = Number(p.sale_price);
      const discount =
        price > 0 ? Math.round((1 - salePrice / price) * 100) : 0;
      const cat = p.category;
      const existing = byCategory.get(cat);
      if (existing) {
        existing.count++;
      } else {
        byCategory.set(cat, { count: 1, discount });
      }
    });

    const result = Array.from(byCategory.entries()).map(([category, v]) => ({
      category,
      count: v.count,
      discount: v.discount,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Promotions GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { category, discountPercent } = await request.json();
    const pct = Number(discountPercent);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      return NextResponse.json(
        { error: "Invalid discount percent" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let query = admin.from("products").select("id, price");
    if (category) query = query.eq("category", category);

    const { data: products } = await query;

    for (const p of products ?? []) {
      const price = Number(p.price);
      const salePrice = price * (1 - pct / 100);
      await admin
        .from("products")
        .update({
          sale_price: Math.round(salePrice * 100) / 100,
          on_sale: true,
        })
        .eq("id", p.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Promotions POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { category } = await request.json();

    const admin = createAdminClient();
    let query = admin.from("products").update({
      sale_price: null,
      on_sale: false,
    });
    if (category) query = query.eq("category", category);
    await query;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Promotions DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
