import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToProduct } from "@/lib/supabase/products";

const ALLOWED_SLUGS = new Set([
  "bed",
  "sofa",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "all",
]);

// Strip everything except alphanumeric, spaces, hyphens, commas, periods
function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ,.\-]/g, "").trim();
}

function parseStringArray(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map(sanitize)
    .filter(Boolean);
}

function parsePrice(param: string | null): number | undefined {
  if (!param) return undefined;
  const n = Number(param);
  if (!Number.isFinite(n) || n < 0 || n > 99999) return undefined;
  return n;
}

function parsePageNumber(param: string | null): number {
  const n = Number(param || "1");
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 500);
}

const LIMIT = 24;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Validate slug
  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 404 });
  }

  const url = request.nextUrl.searchParams;

  const manufacturers = parseStringArray(url.get("manufacturers"));
  const collections = parseStringArray(url.get("collections"));
  const colors = parseStringArray(url.get("colors"));
  const sizes = parseStringArray(url.get("sizes"));
  const inStockOnly = url.get("inStock") === "true";
  const priceMin = parsePrice(url.get("priceMin"));
  const priceMax = parsePrice(url.get("priceMax"));
  const page = parsePageNumber(url.get("page"));
  const sort = sanitize(url.get("sort") || "name-asc");

  // Clamp offset to max 10000
  const offset = Math.min((page - 1) * LIMIT, 10000);

  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  // Category filter — skip for 'all'
  if (slug !== "all") {
    query = query.eq("category", slug);
  }

  // Manufacturer filter
  if (manufacturers.length > 0) {
    query = query.in("manufacturer", manufacturers);
  }

  // Collection filter
  if (collections.length > 0) {
    query = query.in("collection", collections);
  }

  // Color filter
  if (colors.length > 0) {
    if (slug === "rug") {
      // Rug colors are comma-separated in the DB field — use ilike per color
      const colorFilter = colors
        .map((c) => `color.ilike.%${c}%`)
        .join(",");
      query = query.or(colorFilter);
    } else {
      query = query.in("color", colors);
    }
  }

  // In-stock filter
  if (inStockOnly) {
    query = query.eq("in_stock", true);
  }

  // Price range filters
  if (priceMin != null) {
    query = query.gte("price", priceMin);
  }
  if (priceMax != null) {
    query = query.lte("price", priceMax);
  }

  // Sort
  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  query = query.range(offset, offset + LIMIT - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("collection products API error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let products = (data ?? []).map(mapRowToProduct);

  // Rug size filter — applied post-fetch (dimensions is JSONB)
  if (sizes.length > 0) {
    const sizeSet = new Set(sizes);
    products = products.filter((p) => {
      const raw = (data ?? []).find((d) => d.id === p.id);
      const dims = raw?.dimensions as Record<string, unknown> | null;
      return (
        dims && typeof dims.size === "string" && sizeSet.has(dims.size)
      );
    });
  }

  const total = sizes.length > 0 ? products.length : (count ?? 0);

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / LIMIT),
  });
}
