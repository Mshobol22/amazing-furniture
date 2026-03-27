import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000;

export type AdminFilterStats = {
  manufacturerCounts: { value: string; count: number }[];
  /** All categories (global), sorted by count descending */
  categoryCounts: { value: string; count: number }[];
  /** Categories per manufacturer (for sidebar when a manufacturer is selected) */
  categoriesByManufacturer: Record<string, { value: string; count: number }[]>;
  stockCounts: { inStock: number; outOfStock: number };
};

function toSortedOptions(map: Map<string, number>): { value: string; count: number }[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function computeAdminFilterStats(
  rows: Array<{
    manufacturer: string | null;
    category: string | null;
    in_stock: boolean | null;
  }>
): AdminFilterStats {
  const mfrMap = new Map<string, number>();
  const catMap = new Map<string, number>();
  const mfrCatMap = new Map<string, Map<string, number>>();
  let inStock = 0;
  let outStock = 0;

  for (const r of rows) {
    const m =
      typeof r.manufacturer === "string" && r.manufacturer.trim()
        ? r.manufacturer.trim()
        : "Unknown";
    mfrMap.set(m, (mfrMap.get(m) ?? 0) + 1);

    const cat =
      typeof r.category === "string" && r.category.trim()
        ? r.category.trim()
        : "Uncategorized";
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);

    if (!mfrCatMap.has(m)) mfrCatMap.set(m, new Map());
    const cm = mfrCatMap.get(m)!;
    cm.set(cat, (cm.get(cat) ?? 0) + 1);

    if (r.in_stock === false) outStock += 1;
    else inStock += 1;
  }

  const categoriesByManufacturer: Record<string, { value: string; count: number }[]> = {};
  for (const [m, cmap] of Array.from(mfrCatMap.entries())) {
    categoriesByManufacturer[m] = toSortedOptions(cmap);
  }

  return {
    manufacturerCounts: toSortedOptions(mfrMap),
    categoryCounts: toSortedOptions(catMap),
    categoriesByManufacturer,
    stockCounts: { inStock, outOfStock: outStock },
  };
}

/** Filter sidebar stats only — three light columns, chunked (safe for SSR). */
export async function fetchAdminFilterStatsSlim(): Promise<AdminFilterStats> {
  const admin = createAdminClient();
  const slim: Array<{
    manufacturer: string | null;
    category: string | null;
    in_stock: boolean | null;
  }> = [];

  for (let from = 0; ; from += PAGE) {
    const to = from + PAGE - 1;
    const { data, error } = await admin
      .from("products")
      .select("manufacturer, category, in_stock")
      .range(from, to);

    if (error) throw error;
    const chunk = data ?? [];
    for (const row of chunk) {
      slim.push({
        manufacturer: (row.manufacturer as string | null) ?? null,
        category: (row.category as string | null) ?? null,
        in_stock: row.in_stock === false ? false : row.in_stock === true ? true : null,
      });
    }
    if (chunk.length < PAGE) break;
  }

  return computeAdminFilterStats(slim);
}

export async function fetchAdminProductsRange(
  from: number,
  to: number
): Promise<Record<string, unknown>[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*")
    .order("name", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return data ?? [];
}
