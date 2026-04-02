import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user && isAdmin(user);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sale_event_products")
    .select(
      "sale_event_id, product_id, discount_percentage, override_sale_price, products!inner(id, name, sku, price, sale_price, on_sale, manufacturer, category, images)"
    )
    .eq("sale_event_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ProductRow = {
    id: string;
    name: string;
    sku: string | null;
    price: number | null;
    sale_price: number | null;
    on_sale: boolean | null;
    manufacturer: string | null;
    category: string | null;
    images: string[] | null;
  };

  const items = (data ?? [])
    .map(
      (row: {
        product_id: string;
        discount_percentage: number | null;
        override_sale_price: number | null;
        products: ProductRow | ProductRow[];
      }) => {
        const product = Array.isArray(row.products) ? row.products[0] : row.products;
        if (!product) return null;
        return {
          product_id: row.product_id,
          discount_percentage: row.discount_percentage,
          override_sale_price: row.override_sale_price,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            sale_price: product.sale_price,
            on_sale: product.on_sale,
            manufacturer: product.manufacturer,
            category: product.category,
            image: product.images?.[0] ?? null,
          },
        };
      }
    )
    .filter(Boolean);

  return NextResponse.json({ products: items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const productId = String(body.product_id ?? "").trim();
  const discountPercentage = Number(body.discount_percentage);

  if (!productId) {
    return NextResponse.json({ error: "product_id is required" }, { status: 400 });
  }

  if (
    !Number.isFinite(discountPercentage) ||
    discountPercentage < 0 ||
    discountPercentage > 100
  ) {
    return NextResponse.json({ error: "Invalid discount percentage" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: productRow, error: productFetchError } = await admin
    .from("products")
    .select("price")
    .eq("id", productId)
    .single();

  if (productFetchError || !productRow) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const basePrice = Number(productRow.price);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return NextResponse.json({ error: "Invalid product price" }, { status: 400 });
  }

  const salePrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;

  const { error: junctionError } = await admin
    .from("sale_event_products")
    .upsert(
      {
        sale_event_id: id,
        product_id: productId,
        discount_percentage: discountPercentage,
        override_sale_price: salePrice,
      },
      { onConflict: "sale_event_id,product_id" }
    );

  if (junctionError) {
    return NextResponse.json({ error: junctionError.message }, { status: 400 });
  }

  const { error: productUpdateError } = await admin
    .from("products")
    .update({
      on_sale: true,
      sale_price: salePrice,
    })
    .eq("id", productId);

  if (productUpdateError) {
    return NextResponse.json({ error: productUpdateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
