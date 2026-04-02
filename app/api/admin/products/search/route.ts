import { NextRequest, NextResponse } from "next/server";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchRow = {
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

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intVal = Math.floor(parsed);
  return intVal > 0 ? intVal : fallback;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = toPositiveInt(request.nextUrl.searchParams.get("page"), 1);
  const limit = Math.min(toPositiveInt(request.nextUrl.searchParams.get("limit"), 25), 25);

  if (q.length < 2) {
    return NextResponse.json({
      results: [],
      total: 0,
      page,
      totalPages: 0,
    });
  }

  const safeQ = q.replace(/[,%()]/g, " ").trim();
  const queryTerm = safeQ.length >= 2 ? safeQ : q;
  const isLikelySku = /[\d-]/.test(queryTerm);

  const admin = createAdminClient();
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const selectColumns =
    "id, name, sku, price, sale_price, on_sale, manufacturer, category, images";
  const orFilter = `sku.ilike.%${queryTerm}%,name.ilike.%${queryTerm}%`;

  let searchQuery = admin
    .from("products")
    .select(selectColumns)
    .or(orFilter)
    .range(from, to);

  searchQuery = isLikelySku
    ? searchQuery.order("sku", { ascending: true }).order("name", { ascending: true })
    : searchQuery.order("name", { ascending: true });

  const [rowsResult, countResult] = await Promise.all([
    searchQuery,
    admin.from("products").select("id", { count: "exact", head: true }).or(orFilter),
  ]);

  if (rowsResult.error || countResult.error) {
    return NextResponse.json(
      { error: rowsResult.error?.message || countResult.error?.message || "Search failed" },
      { status: 500 }
    );
  }

  const rows = (rowsResult.data ?? []) as SearchRow[];
  const total = countResult.count ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return NextResponse.json({
    results: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      price: row.price,
      sale_price: row.sale_price,
      on_sale: row.on_sale,
      manufacturer: row.manufacturer,
      category: row.category,
      image: row.images?.[0] ?? null,
    })),
    total,
    page,
    totalPages,
  });
}
