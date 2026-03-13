import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

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
      const ftQuery = supabase
        .from("products")
        .select("id, name, slug, price, sale_price, images, category, in_stock")
        .textSearch("search_vector", tsQuery, {
          type: "plain",
          config: "english",
        })
        .eq("in_stock", true)
        .limit(limit);

      const { data } = await ftQuery;
      ftResults = (data ?? []) as Record<string, unknown>[];
    }

    if (detectedCategory && ftResults.length < 5) {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, images, category, in_stock")
        .eq("category", detectedCategory)
        .eq("in_stock", true)
        .limit(limit);
      categoryResults = (data ?? []) as Record<string, unknown>[];
    }

    let fuzzyResults: Record<string, unknown>[] = [];
    if (ftResults.length < 3) {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, images, category, in_stock")
        .ilike("name", `%${query}%`)
        .eq("in_stock", true)
        .limit(limit);
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

    return NextResponse.json(
      merged.slice(0, limit).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: (p.sale_price ?? p.price) as number,
        originalPrice: p.price as number,
        onSale: !!(p.sale_price && (p.sale_price as number) < (p.price as number)),
        image: (p.images as string[])?.[0] ?? null,
        category: p.category,
      }))
    );
  } catch (err) {
    console.error("Search error:", err);
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price, sale_price, images, category")
      .ilike("name", `%${query}%`)
      .eq("in_stock", true)
      .limit(limit);

    return NextResponse.json(
      (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.sale_price ?? p.price,
        originalPrice: p.price,
        onSale: !!(p.sale_price && p.sale_price < p.price),
        image: p.images?.[0] ?? null,
        category: p.category,
      }))
    );
  }
}
