import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/promotions/product?q=name — product search for admin UI
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const admin = createAdminClient();
  // ilike uses parameterized binding under PostgREST — no string concatenation
  const { data } = await admin
    .from("products")
    .select("id, name, price, category, on_sale, sale_price")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(10);

  return NextResponse.json(data ?? []);
}

// POST /api/admin/promotions/product — set a product-specific sale price
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { product_id, sale_price } = body;

  if (!product_id || typeof product_id !== "string") {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  const salePrice = Number(sale_price);
  if (!isFinite(salePrice) || salePrice <= 0) {
    return NextResponse.json(
      { error: "sale_price must be a positive number" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Fetch original price server-side to validate
  const { data: product, error: fetchError } = await admin
    .from("products")
    .select("id, price")
    .eq("id", product_id)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const originalPrice = Number(product.price);
  if (salePrice >= originalPrice) {
    return NextResponse.json(
      {
        error: `sale_price ($${salePrice.toFixed(2)}) must be less than original price ($${originalPrice.toFixed(2)})`,
      },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("products")
    .update({
      on_sale: true,
      sale_price: Math.round(salePrice * 100) / 100,
    })
    .eq("id", product_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
