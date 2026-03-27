import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

/** Avoid breaking PostgREST `or()` comma-separated filter syntax */
function sanitizeSearchToken(q: string): string {
  return q.replace(/,/g, " ").trim();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const raw = request.nextUrl.searchParams.get("q") ?? "";
    const token = sanitizeSearchToken(raw);
    if (!token) {
      return NextResponse.json({ products: [] as Product[] });
    }

    const pattern = `%${token}%`;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("products")
      .select("*")
      .or(`name.ilike.${pattern},sku.ilike.${pattern}`)
      .order("name", { ascending: true })
      .range(0, 9999);

    if (error) {
      console.error("admin products search:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const products = (data ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    ) as Product[];

    return NextResponse.json({ products });
  } catch (err) {
    console.error("admin products search:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
