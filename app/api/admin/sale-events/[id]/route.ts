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

async function productHasOtherActiveSale(productId: string, excludedSaleEventId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("sale_event_products")
    .select("id, sale_events!inner(id, is_active)")
    .eq("product_id", productId)
    .eq("sale_events.is_active", true);

  if (excludedSaleEventId) {
    query = query.neq("sale_event_id", excludedSaleEventId);
  }

  const { data } = await query.limit(1);
  return (data ?? []).length > 0;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  };
  delete updateData.id;
  delete updateData.created_at;

  const { data, error } = await admin
    .from("sale_events")
    .update(updateData)
    .eq("id", id)
    .select("id, name, slug, description, sale_type, badge_text, badge_color, banner_headline, banner_subtext, discount_label, start_date, end_date, is_active, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: links, error: linksError } = await admin
    .from("sale_event_products")
    .select("product_id")
    .eq("sale_event_id", id);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const affectedProductIds = Array.from(
    new Set((links ?? []).map((row: { product_id: string }) => row.product_id))
  );

  const { error: deleteProductsError } = await admin
    .from("sale_event_products")
    .delete()
    .eq("sale_event_id", id);
  if (deleteProductsError) {
    return NextResponse.json({ error: deleteProductsError.message }, { status: 500 });
  }

  const { error: deleteEventError } = await admin.from("sale_events").delete().eq("id", id);
  if (deleteEventError) {
    return NextResponse.json({ error: deleteEventError.message }, { status: 500 });
  }

  for (const productId of affectedProductIds) {
    const hasOtherActive = await productHasOtherActiveSale(productId, id);
    if (!hasOtherActive) {
      await admin
        .from("products")
        .update({ on_sale: false, sale_price: null })
        .eq("id", productId);
    }
  }

  return NextResponse.json({ ok: true });
}
