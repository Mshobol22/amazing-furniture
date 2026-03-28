import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

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

function normManufacturer(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  return t === "" ? "Unknown" : t;
}

function normCategory(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  return t === "" ? "Uncategorized" : t;
}

/**
 * Same aggregates as the admin_products_* RPCs, computed in Node.
 * Used when RPCs are missing (migration not applied) — ~6.5k narrow rows is acceptable.
 */
async function fetchAdminFilterStatsFallback(
  admin: SupabaseClient
): Promise<AdminFilterStats> {
  const { data, error } = await admin
    .from("products")
    .select("manufacturer, category, in_stock");

  if (error) throw error;

  const manufacturerMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const byMfr = new Map<string, Map<string, number>>();
  let inStock = 0;
  let outOfStock = 0;

  for (const row of data ?? []) {
    const r = row as {
      manufacturer: string | null;
      category: string | null;
      in_stock: boolean | null;
    };
    const m = normManufacturer(r.manufacturer);
    manufacturerMap.set(m, (manufacturerMap.get(m) ?? 0) + 1);

    const c = normCategory(r.category);
    categoryMap.set(c, (categoryMap.get(c) ?? 0) + 1);

    let inner = byMfr.get(m);
    if (!inner) {
      inner = new Map();
      byMfr.set(m, inner);
    }
    inner.set(c, (inner.get(c) ?? 0) + 1);

    if (r.in_stock === true) inStock++;
    else if (r.in_stock === false) outOfStock++;
  }

  const categoriesByManufacturer: Record<string, { value: string; count: number }[]> = {};
  for (const [mfr, catMap] of Array.from(byMfr.entries())) {
    categoriesByManufacturer[mfr] = toSortedOptions(catMap);
  }

  return {
    manufacturerCounts: toSortedOptions(manufacturerMap),
    categoryCounts: toSortedOptions(categoryMap),
    categoriesByManufacturer,
    stockCounts: { inStock, outOfStock },
  };
}

/** Filter sidebar stats via SQL GROUP BY RPCs (no full-table row scans). */
export async function fetchAdminFilterStatsSlim(): Promise<AdminFilterStats> {
  const admin = createAdminClient();

  if (process.env.ADMIN_FILTER_STATS_FORCE_FALLBACK === "1") {
    return fetchAdminFilterStatsFallback(admin);
  }

  const [mfrRes, catRes, mfrCatRes, stockRes] = await Promise.all([
    admin.rpc("admin_products_manufacturer_counts"),
    admin.rpc("admin_products_category_counts"),
    admin.rpc("admin_products_categories_by_manufacturer"),
    admin.rpc("admin_products_stock_counts"),
  ]);

  const rpcErr =
    mfrRes.error ?? catRes.error ?? mfrCatRes.error ?? stockRes.error;
  if (rpcErr) {
    // PGRST202 = function not in schema cache / migration not applied; any RPC error → fallback
    console.warn(
      "[admin-products] filter stats RPC failed, using direct products query:",
      rpcErr.code,
      rpcErr.message ?? rpcErr
    );
    return fetchAdminFilterStatsFallback(admin);
  }

  const manufacturerCounts = (mfrRes.data ?? []).map((r: { value: string; count: number | string }) => ({
    value: r.value,
    count: Number(r.count),
  }));

  const categoryCounts = (catRes.data ?? []).map((r: { value: string; count: number | string }) => ({
    value: r.value,
    count: Number(r.count),
  }));

  const categoriesByManufacturer: Record<string, { value: string; count: number }[]> = {};
  for (const row of mfrCatRes.data ?? []) {
    const m = (row as { manufacturer: string; category: string; count: number | string }).manufacturer;
    const c = (row as { manufacturer: string; category: string; count: number | string }).category;
    const n = Number((row as { count: number | string }).count);
    if (!categoriesByManufacturer[m]) categoriesByManufacturer[m] = [];
    categoriesByManufacturer[m].push({ value: c, count: n });
  }
  for (const m of Object.keys(categoriesByManufacturer)) {
    categoriesByManufacturer[m].sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value)
    );
  }

  const stockRow = (stockRes.data ?? [])[0] as
    | { in_stock: number | string; out_of_stock: number | string }
    | undefined;

  return {
    manufacturerCounts,
    categoryCounts,
    categoriesByManufacturer,
    stockCounts: {
      inStock: Number(stockRow?.in_stock ?? 0),
      outOfStock: Number(stockRow?.out_of_stock ?? 0),
    },
  };
}
