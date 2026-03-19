import { NextRequest, NextResponse } from "next/server";
import {
  getManufacturerBySlug,
  getFilteredProducts,
} from "@/lib/supabase/products";

// Sanitize: only allow alphanumeric, spaces, hyphens, commas, periods
function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ,.\-]/g, "").trim();
}

// Type/subcategory values may contain & (e.g. "Accent & End Tables")
function sanitizeType(value: string): string {
  return value.replace(/[^a-zA-Z0-9 &\-]/g, "").trim();
}

function parseStringArray(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map(sanitize)
    .filter(Boolean);
}

function parseNumber(param: string | null): number | undefined {
  if (!param) return undefined;
  const n = Number(param);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const manufacturer = await getManufacturerBySlug(slug);

  if (!manufacturer) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  const url = request.nextUrl.searchParams;

  const categories = parseStringArray(url.get("categories"));
  const collections = parseStringArray(url.get("collections"));
  const colors = parseStringArray(url.get("colors"));
  const sizes = parseStringArray(url.get("sizes"));
  const types = (url.get("type") ?? "")
    .split(",")
    .map(sanitizeType)
    .filter((t) => t.length > 0);
  const inStockOnly = url.get("inStock") === "true";
  const priceMin = parseNumber(url.get("priceMin"));
  const priceMax = parseNumber(url.get("priceMax"));
  const page = Math.max(1, Number(url.get("page") || "1"));
  const limit = Math.min(48, Math.max(1, Number(url.get("limit") || "24")));
  const sort = sanitize(url.get("sort") || "name-asc");

  const offset = (page - 1) * limit;

  const { products, total } = await getFilteredProducts({
    manufacturerName: manufacturer.name,
    categories: categories.length > 0 ? categories : undefined,
    collections: collections.length > 0 ? collections : undefined,
    colors: colors.length > 0 ? colors : undefined,
    sizes: sizes.length > 0 ? sizes : undefined,
    subcategories: types.length > 0 ? types : undefined,
    inStockOnly,
    priceMin,
    priceMax,
    limit,
    offset,
    sort,
  });

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
