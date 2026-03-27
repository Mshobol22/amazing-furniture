import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { mapRowToProduct } from "@/lib/supabase/products";
import { fetchAdminProductsRange } from "@/lib/admin/admin-products-data";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

/** Keep each response under typical platform body limits (~4MB). */
const MAX_LIMIT = 400;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const offset = Math.max(0, parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10) || 0);
    const limitRaw = parseInt(request.nextUrl.searchParams.get("limit") ?? String(MAX_LIMIT), 10);
    const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw || MAX_LIMIT));

    const rows = await fetchAdminProductsRange(offset, offset + limit - 1);
    const products = rows.map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    ) as Product[];

    return NextResponse.json({ products, offset, limit });
  } catch (err) {
    console.error("admin products catalog:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
