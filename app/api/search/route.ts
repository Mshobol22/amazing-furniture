import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyAcmeComponentListingFilter,
  applyAcmePlaceholderImageFilter,
  applyZinatexListingVisibilityFilter,
  attachZinatexFromPrices,
  isHiddenFromProductListingByImage,
  isHiddenAcmeComponentProduct,
  mapRowToProduct,
} from "@/lib/supabase/products";
import { getStorefrontListPrice } from "@/lib/zinatex-product-display";
import type { Product } from "@/types";

// Category keyword mapping — user types natural language, we map to DB category
const CATEGORY_MAP: Record<string, string> = {
  sofa: "sofa",
  sofas: "sofa",
  sectional: "sofa",
  sectionals: "sofa",
  couch: "sofa",
  couches: "sofa",
  loveseat: "sofa",
  loveseats: "sofa",
  recliner: "sofa",
  recliners: "sofa",
  futon: "sofa",
  bed: "bed",
  beds: "bed",
  bedroom: "bed",
  headboard: "bed",
  mattress: "bed",
  bedframe: "bed",
  "bed frame": "bed",
  chair: "chair",
  chairs: "chair",
  armchair: "chair",
  stool: "chair",
  ottoman: "chair",
  accent: "chair",
  rocker: "chair",
  table: "table",
  tables: "table",
  dining: "table",
  desk: "table",
  coffee: "table",
  "end table": "table",
  nightstand: "table",
  cabinet: "cabinet",
  cabinets: "cabinet",
  dresser: "cabinet",
  wardrobe: "cabinet",
  bookcase: "cabinet",
  bookshelf: "cabinet",
  storage: "cabinet",
  chest: "cabinet",
  drawer: "cabinet",
  tv: "tv-stand",
  "tv stand": "tv-stand",
  entertainment: "tv-stand",
  media: "tv-stand",
  console: "tv-stand",
};

function detectCategory(query: string): string | null {
  const lower = query.toLowerCase().trim();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  for (const word of lower.split(/\s+/)) {
    if (CATEGORY_MAP[word]) return CATEGORY_MAP[word];
  }
  return null;
}

function searchResultPayload(p: Product) {
  const list = getStorefrontListPrice(p);
  const onSale = Boolean(
    p.on_sale && p.sale_price != null && p.sale_price < list
  );
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: onSale ? (p.sale_price as number) : list,
    originalPrice: list,
    onSale,
    image: p.images?.[0] ?? null,
    category: p.category,
  };
}

async function hydrateProductsByIdOrder(
  supabase: ReturnType<typeof createAdminClient>,
  idOrder: string[]
): Promise<Product[]> {
  if (idOrder.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", idOrder);
  if (error) throw error;
  const byId = new Map(
    (data ?? []).map((r) => [r.id as string, r as Record<string, unknown>])
  );
  const ordered = idOrder
    .map((id) => byId.get(id))
    .filter((row): row is Record<string, unknown> => row != null)
    .map(mapRowToProduct)
    .filter((p) => !isHiddenFromProductListingByImage(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  return attachZinatexFromPrices(ordered);
}

function buildTsQuery(query: string): string {
  const words = query
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => `${w}:*`);
  return words.join(" & ");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "15"), 50);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createAdminClient();

  try {
    const tsQuery = buildTsQuery(query);
    const detectedCategory = detectCategory(query);

    let ftResults: Record<string, unknown>[] = [];
    let categoryResults: Record<string, unknown>[] = [];

    if (tsQuery) {
      let ftQuery = supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, images, category, in_stock, manufacturer, images_validated, acme_product_type"
        )
        .textSearch("search_vector", tsQuery, {
          type: "plain",
          config: "english",
        })
        .eq("in_stock", true)
        .limit(limit);

      ftQuery = applyAcmePlaceholderImageFilter(ftQuery);
      ftQuery = applyZinatexListingVisibilityFilter(ftQuery);
      ftQuery = applyAcmeComponentListingFilter(ftQuery);

      const { data } = await ftQuery;
      ftResults = (data ?? []) as Record<string, unknown>[];
    }

    if (detectedCategory && ftResults.length < 5) {
      let categoryQuery = supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, images, category, in_stock, manufacturer, images_validated, acme_product_type"
        )
        .eq("category", detectedCategory)
        .eq("in_stock", true)
        .limit(limit);

      categoryQuery = applyAcmePlaceholderImageFilter(categoryQuery);
      categoryQuery = applyZinatexListingVisibilityFilter(categoryQuery);
      categoryQuery = applyAcmeComponentListingFilter(categoryQuery);

      const { data } = await categoryQuery;
      categoryResults = (data ?? []) as Record<string, unknown>[];
    }

    let fuzzyResults: Record<string, unknown>[] = [];
    if (ftResults.length < 3) {
      let fuzzyQuery = supabase
        .from("products")
        .select(
          "id, name, slug, price, sale_price, images, category, in_stock, manufacturer, images_validated, acme_product_type"
        )
        .ilike("name", `%${query}%`)
        .eq("in_stock", true)
        .limit(limit);

      fuzzyQuery = applyAcmePlaceholderImageFilter(fuzzyQuery);
      fuzzyQuery = applyZinatexListingVisibilityFilter(fuzzyQuery);
      fuzzyQuery = applyAcmeComponentListingFilter(fuzzyQuery);

      const { data } = await fuzzyQuery;
      fuzzyResults = (data ?? []) as Record<string, unknown>[];
    }

    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];

    for (const result of [...ftResults, ...categoryResults, ...fuzzyResults]) {
      const id = result.id as string;
      if (!seen.has(id)) {
        seen.add(id);
        merged.push(result);
      }
    }

    const visible = merged.filter(
      (p) =>
        !isHiddenFromProductListingByImage({
          manufacturer: (p.manufacturer as string | null) ?? null,
          images: (p.images as string[]) ?? [],
          images_validated: (p.images_validated as boolean | null) ?? null,
          acme_product_type: (p.acme_product_type as string | null) ?? null,
        })
    );

    const idOrder = visible.slice(0, limit).map((p) => p.id as string);
    const hydrated = await hydrateProductsByIdOrder(supabase, idOrder);

    return NextResponse.json(hydrated.map(searchResultPayload));
  } catch (err) {
    console.error("Search error:", err);
    let fallbackQuery = supabase
      .from("products")
      .select(
        "id, name, slug, price, sale_price, images, category, manufacturer, images_validated, acme_product_type"
      )
      .ilike("name", `%${query}%`)
      .eq("in_stock", true)
      .limit(limit);

    fallbackQuery = applyAcmePlaceholderImageFilter(fallbackQuery);
    fallbackQuery = applyZinatexListingVisibilityFilter(fallbackQuery);
    fallbackQuery = applyAcmeComponentListingFilter(fallbackQuery);

    const { data } = await fallbackQuery;

    const visible = (data ?? []).filter((p) =>
      !isHiddenFromProductListingByImage({
        manufacturer: (p.manufacturer as string | null) ?? null,
        images: (p.images as string[]) ?? [],
        images_validated: (p.images_validated as boolean | null) ?? null,
        acme_product_type: (p.acme_product_type as string | null) ?? null,
      })
    );

    const idOrder = visible.slice(0, limit).map((p) => p.id as string);
    const hydrated = await hydrateProductsByIdOrder(supabase, idOrder);

    return NextResponse.json(hydrated.map(searchResultPayload));
  }
}
