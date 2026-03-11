import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";

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

    const products = (data ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    );

    return NextResponse.json({ products });
  } catch (err) {
    console.error("Products by IDs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
