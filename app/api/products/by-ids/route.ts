import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachZinatexFromPrices, mapRowToProduct } from "@/lib/supabase/products";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = body.ids as string[] | undefined;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ products: [] });
    }

    const supabase = createAdminClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("id", ids);

    const byId = new Map(
      (data ?? []).map((row) => {
        const p = mapRowToProduct(row as Record<string, unknown>);
        return [p.id, p] as const;
      })
    );
    const ordered = ids.map((id) => byId.get(id)).filter((p) => p != null);
    const products = await attachZinatexFromPrices(ordered);

    return NextResponse.json({ products });
  } catch (err) {
    console.error("Products by IDs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
