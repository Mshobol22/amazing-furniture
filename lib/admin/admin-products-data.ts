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

/** Filter sidebar stats via SQL GROUP BY RPCs (no full-table row scans). */
export async function fetchAdminFilterStatsSlim(): Promise<AdminFilterStats> {
  const admin = createAdminClient();

  const [mfrRes, catRes, mfrCatRes, stockRes] = await Promise.all([
    admin.rpc("admin_products_manufacturer_counts"),
    admin.rpc("admin_products_category_counts"),
    admin.rpc("admin_products_categories_by_manufacturer"),
    admin.rpc("admin_products_stock_counts"),
  ]);

  if (mfrRes.error) throw mfrRes.error;
  if (catRes.error) throw catRes.error;
  if (mfrCatRes.error) throw mfrCatRes.error;
  if (stockRes.error) throw stockRes.error;

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
