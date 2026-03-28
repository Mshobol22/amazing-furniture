/**
 * Collection filter-options aggregates (manufacturers / colors by type + category).
 * Used by the filter-options API route — direct Supabase only (no internal HTTP fetch).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { applyZinatexListingVisibilityFilter } from "@/lib/zinatex-listing-filter";

export async function queryManufacturersForTypes(
  slug: string,
  types: string[]
): Promise<{ name: string; count: number }[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("products")
    .select("manufacturer")
    .eq("in_stock", true)
    .not("manufacturer", "is", null);

  if (slug !== "all") q = q.eq("category", slug);
  q = q.in("subcategory", types);
  q = applyZinatexListingVisibilityFilter(q);

  const { data, error } = await q;
  if (error) throw error;

  const countMap = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.manufacturer) {
      countMap.set(row.manufacturer, (countMap.get(row.manufacturer) ?? 0) + 1);
    }
  }
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

export async function queryColorsForTypesAndManufacturers(
  slug: string,
  types: string[],
  manufacturers: string[]
): Promise<{ color: string; count: number }[]> {
  const supabase = createAdminClient();
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
  if (error) throw error;

  const countMap = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.color) {
      countMap.set(row.color, (countMap.get(row.color) ?? 0) + 1);
    }
  }
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count }));
}
