import { Suspense } from "react";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyAcmePlaceholderImageFilter,
  mapRowToProduct,
  isHiddenAcmePlaceholderProduct,
} from "@/lib/supabase/products";
import CollectionClient from "@/components/collections/CollectionClient";

export const metadata: Metadata = {
  title: "Shop All Furniture",
  description:
    "Shop premium furniture across sofas, beds, chairs, cabinets, tables, TV stands, and rugs. Free shipping over $299.",
  openGraph: {
    title: "Shop All Furniture | Amazing Home Furniture",
    url: "https://amazinghomefurniturestore.com/collections/all",
  },
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/collections/all",
  },
};

const LIMIT = 24;

const CATEGORY_SLUGS = [
  "sofa",
  "bed",
  "bedroom-furniture",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "other",
] as const;

const CATEGORY_DISPLAY: Record<string, string> = {
  sofa: "Sofas & Sectionals",
  bed: "Beds",
  "bedroom-furniture": "Bedroom Furniture",
  chair: "Chairs & Recliners",
  table: "Dining & Tables",
  cabinet: "Cabinets & Storage",
  "tv-stand": "TV Stands & Entertainment",
  rug: "Rugs & Floor Coverings",
  other: "More Furniture",
};

function sanitize(v: string) {
  return v.replace(/[^a-zA-Z0-9 ,.\-]/g, "").trim();
}

function parsePrice(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 99999) return undefined;
  return n;
}

interface ShopAllPageProps {
  searchParams: Promise<Record<string, string | string[]>>;
}

export default async function ShopAllPage({ searchParams }: ShopAllPageProps) {
  const rawParams = await searchParams;

  // Flatten multi-value params to single string
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }

  const supabase = createAdminClient();

  // Parse URL filters
  const categories = (flat["category"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s));
  const manufacturers = (flat["manufacturer"] ?? "")
    .split(",")
    .map(sanitize)
    .filter(Boolean);
  const priceMin = parsePrice(flat["minPrice"]);
  const priceMax = parsePrice(flat["maxPrice"]);
  const sort = sanitize(flat["sort"] || "price-desc");
  const page = Math.max(1, Math.min(Number(flat["page"] || "1"), 500));
  const offset = Math.min((page - 1) * LIMIT, 10000);

  // ── SSR product query ──────────────────────────────────────────────────────

  let productQuery = supabase
    .from("products")
    .select("*", { count: "exact" });

  productQuery = applyAcmePlaceholderImageFilter(productQuery);

  if (categories.length > 0) productQuery = productQuery.in("category", categories);
  if (manufacturers.length > 0) productQuery = productQuery.in("manufacturer", manufacturers);
  if (priceMin != null) productQuery = productQuery.gte("price", priceMin);
  if (priceMax != null) productQuery = productQuery.lte("price", priceMax);

  switch (sort) {
    case "price-asc":
      productQuery = productQuery.order("price", { ascending: true });
      break;
    case "name-asc":
      productQuery = productQuery.order("name", { ascending: true });
      break;
    case "created-desc":
      productQuery = productQuery.order("created_at", { ascending: false });
      break;
    default:
      productQuery = productQuery.order("price", { ascending: false });
  }

  productQuery = productQuery.range(offset, offset + LIMIT - 1);

  // ── Category counts + Manufacturer counts (for sidebar) ───────────────────

  const [productResult, catResult, mfrResult] = await Promise.all([
    productQuery,
    supabase
      .from("products")
      .select("category")
      .not("category", "is", null)
      .not("images", "is", null)
      .not("images", "eq", "{}"),
    supabase
      .from("products")
      .select("manufacturer")
      .not("manufacturer", "is", null)
      .not("images", "is", null)
      .not("images", "eq", "{}"),
  ]);

  const initialProducts = (productResult.data ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));
  const initialTotal = productResult.count ?? 0;

  // Build category counts
  const catCounts: Record<string, number> = {};
  for (const row of catResult.data ?? []) {
    const c = row.category as string;
    if (c) catCounts[c] = (catCounts[c] ?? 0) + 1;
  }
  const categoryCounts = CATEGORY_SLUGS.map((slug) => ({
    slug,
    name: CATEGORY_DISPLAY[slug] ?? slug,
    count: catCounts[slug] ?? 0,
  })).filter((c) => c.count > 0);

  // Build manufacturer counts
  const mfrCounts: Record<string, number> = {};
  for (const row of mfrResult.data ?? []) {
    const m = row.manufacturer as string;
    if (m) mfrCounts[m] = (mfrCounts[m] ?? 0) + 1;
  }
  const allBrands = ["Nationwide FD", "United Furniture", "ACME", "Zinatex"]
    .map((name) => ({ name, count: mfrCounts[name] ?? 0 }))
    .filter((b) => b.count > 0);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Hero bar */}
      <div className="flex flex-col items-center justify-center gap-1 py-5 bg-[#1C1C1C]">
        <h1 className="font-display text-xl font-semibold text-[#FAF8F5] md:text-2xl">
          All Products
        </h1>
        <p className="text-xs text-[#FAF8F5]/70">
          {initialTotal.toLocaleString()} product{initialTotal !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <CollectionClient
            slug="all"
            initialProducts={initialProducts}
            initialTotal={initialTotal}
            availableSubcategories={[]}
            categoryCounts={categoryCounts}
            allBrands={allBrands}
          />
        </Suspense>
      </div>
    </div>
  );
}
