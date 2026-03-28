import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";
import type { Product } from "@/types";
import {
  PAGE_SIZE,
  applyAdminCatalogFilters,
  orderAdminCatalog,
  parseAdminCatalogSearchParams,
} from "@/lib/admin/admin-products-catalog-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const filters = parseAdminCatalogSearchParams(request.nextUrl.searchParams);
    const admin = createAdminClient();

    const countBase = admin.from("products").select("*", { count: "exact", head: true });
    const countQuery = applyAdminCatalogFilters(countBase, filters);
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error("admin products catalog count:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const total = totalCount ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let dataQuery = admin.from("products").select("*");
    dataQuery = applyAdminCatalogFilters(dataQuery, filters);
    dataQuery = orderAdminCatalog(dataQuery, filters.sort);
    const { data, error } = await dataQuery.range(from, to);

    if (error) {
      console.error("admin products catalog:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const products = (data ?? []).map((row) =>
      mapRowToProduct(row as Record<string, unknown>)
    ) as Product[];

    return NextResponse.json({
      products,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    console.error("admin products catalog:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
