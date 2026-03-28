import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyZinatexListingVisibilityFilter } from "@/lib/supabase/products";

export const dynamic = "force-dynamic";

const ALLOWED_SLUGS = new Set([
  "bed",
  "bedroom-furniture",
  "sofa",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "other",
  "all",
]);

const TYPE_RE = /^[a-zA-Z0-9 &\-]+$/;

function parseTypes(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((t) => t.trim())
    .filter((t) => TYPE_RE.test(t) && t.length > 0);
}

function parseManufacturers(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 404 });
  }

  const url = request.nextUrl.searchParams;
  const types = parseTypes(url.get("type"));

  if (types.length === 0) {
    return NextResponse.json({ error: "type param required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const manufacturerParam = url.get("manufacturer");

  // ── MODE 2: return colors for category + types + manufacturer(s) ─────────
  if (manufacturerParam !== null) {
    const manufacturers = parseManufacturers(manufacturerParam);
    if (manufacturers.length === 0) {
      return NextResponse.json({ colors: [] });
    }

    let q = supabase
      .from("products")
      .select("color")
      .eq("in_stock", true)
      .not("color", "is", null)
      .neq("color", "");

    if (slug !== "all") q = q.eq("category", slug);
    q = q.in("subcategory", types);
    q = q.in("manufacturer", manufacturers);
    q = applyZinatexListingVisibilityFilter(q);

    const { data, error } = await q;
    if (error) {
      console.error("filter-options colors error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    const countMap = new Map<string, number>();
    for (const row of data ?? []) {
      if (row.color) {
        countMap.set(row.color, (countMap.get(row.color) ?? 0) + 1);
      }
    }
    const colors = Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => ({ color, count }));

    return NextResponse.json({ colors });
  }

  // ── MODE 1: return manufacturers for category + types ────────────────────
  let q = supabase
    .from("products")
    .select("manufacturer")
    .eq("in_stock", true)
    .not("manufacturer", "is", null);

  if (slug !== "all") q = q.eq("category", slug);
  q = q.in("subcategory", types);
  q = applyZinatexListingVisibilityFilter(q);

  const { data, error } = await q;
  if (error) {
    console.error("filter-options manufacturers error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const countMap = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.manufacturer) {
      countMap.set(row.manufacturer, (countMap.get(row.manufacturer) ?? 0) + 1);
    }
  }
  const manufacturers = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({ manufacturers });
}
