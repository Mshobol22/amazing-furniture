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

async function hasActiveSaleForProduct(productId: string, excludedSaleEventId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sale_event_products")
    .select("id, sale_events!inner(id, is_active)")
    .eq("product_id", productId)
    .neq("sale_event_id", excludedSaleEventId)
    .eq("sale_events.is_active", true)
    .limit(1);
  return (data ?? []).length > 0;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, productId } = await params;
  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("sale_event_products")
    .delete()
    .eq("sale_event_id", id)
    .eq("product_id", productId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const stillInActiveSale = await hasActiveSaleForProduct(productId, id);
  if (!stillInActiveSale) {
    const { error: updateError } = await admin
      .from("products")
      .update({ on_sale: false, sale_price: null })
      .eq("id", productId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
