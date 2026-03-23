import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadonlyURLSearchParams } from "next/navigation";

export interface ProductFilters {
  manufacturer?: string[];
  category?: string[];
  color?: string[];
  material?: string[];
  collection?: string[];
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  on_sale?: boolean;
  sort?: "price_asc" | "price_desc" | "newest" | "name_asc";
}

export type FilterMetaRow = {
  manufacturer?: string | null;
  category?: string | null;
  color?: string | null;
  material?: string | null;
  collection?: string | null;
  price?: number | null;
  in_stock?: boolean | null;
  on_sale?: boolean | null;
};

type CountableDimension =
  | "manufacturer"
  | "category"
  | "color"
  | "material"
  | "collection";

// ── parseFiltersFromSearchParams ───────────────────────────────────────────

export function parseFiltersFromSearchParams(
  params: URLSearchParams | ReadonlyURLSearchParams
): ProductFilters {
  const get = (key: string) => params.get(key);

  const getArr = (key: string): string[] | undefined => {
    const v = params.get(key);
    const arr = v ? v.split(",").filter(Boolean) : [];
    return arr.length > 0 ? arr : undefined;
  };

  const minRaw = get("price_min");
  const maxRaw = get("price_max");
  const sortRaw = get("sort");

  const VALID_SORTS = ["price_asc", "price_desc", "newest", "name_asc"] as const;
  type SortType = (typeof VALID_SORTS)[number];
  const sort =
    sortRaw && VALID_SORTS.includes(sortRaw as SortType)
      ? (sortRaw as SortType)
      : undefined;

  return {
    manufacturer: getArr("manufacturer"),
    category: getArr("category"),
    color: getArr("color"),
    material: getArr("material"),
    collection: getArr("collection"),
    price_min: minRaw ? Number(minRaw) : undefined,
    price_max: maxRaw ? Number(maxRaw) : undefined,
    in_stock: get("in_stock") === "true" ? true : undefined,
    on_sale: get("on_sale") === "true" ? true : undefined,
    sort,
  };
}

// ── buildSupabaseQuery ─────────────────────────────────────────────────────
// Never uses string concatenation — only Supabase's parameterized methods.

export function buildSupabaseQuery(
  _supabase: SupabaseClient,
  baseQuery: any, // Supabase query builder — complex generics not worth typing
  filters: ProductFilters
): any {
  let q = baseQuery;

  if (filters.manufacturer?.length) q = q.in("manufacturer", filters.manufacturer);
  if (filters.category?.length) q = q.in("category", filters.category);
  if (filters.color?.length) q = q.in("color", filters.color);
  if (filters.material?.length) q = q.in("material", filters.material);
  if (filters.collection?.length) q = q.in("collection", filters.collection);
  if (filters.price_min != null) q = q.gte("price", filters.price_min);
  if (filters.price_max != null) q = q.lte("price", filters.price_max);
  if (filters.in_stock) q = q.eq("in_stock", true);
  if (filters.on_sale) q = q.eq("on_sale", true);

  switch (filters.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "newest":
      q = q.order("created_at", { ascending: false });
      break;
    default:
      q = q.order("name", { ascending: true });
  }

  return q;
}

// ── computeFacetCounts ─────────────────────────────────────────────────────
// Returns per-option counts for one dimension, applying all OTHER active
// filters first (faceted counting).

export function computeFacetCounts(
  allProducts: FilterMetaRow[],
  activeFilters: ProductFilters,
  dimension: CountableDimension
): Record<string, number> {
  // Build a filters object with the current dimension omitted
  const without: ProductFilters = { ...activeFilters, [dimension]: undefined };

  const filtered = allProducts.filter((p) => {
    if (without.manufacturer?.length && !without.manufacturer.includes(p.manufacturer ?? ""))
      return false;
    if (without.category?.length && !without.category.includes(p.category ?? ""))
      return false;
    if (without.color?.length && !without.color.includes(p.color ?? ""))
      return false;
    if (without.material?.length && !without.material.includes(p.material ?? ""))
      return false;
    if (without.collection?.length && !without.collection.includes(p.collection ?? ""))
      return false;
    if (without.price_min != null && (p.price ?? 0) < without.price_min) return false;
    if (without.price_max != null && (p.price ?? 0) > without.price_max) return false;
    if (without.in_stock && !p.in_stock) return false;
    if (without.on_sale && !p.on_sale) return false;
    return true;
  });

  const counts: Record<string, number> = {};
  for (const p of filtered) {
    const val = p[dimension];
    if (val) counts[val] = (counts[val] ?? 0) + 1;
  }

  return counts;
}

// ── buildFilterMeta ────────────────────────────────────────────────────────
// Strips images and normalises raw DB rows into FilterMetaRow[], removing
// ACME placeholder products. Call server-side before passing to sidebar.

const ACME_MARKERS = ["coming-soon", "placeholder"];

export function buildFilterMeta(
  rawRows: any[] // raw Supabase rows before mapping
): FilterMetaRow[] {
  return rawRows
    .filter((row) => {
      const imgs = row.images as string[] | null;
      const lead = imgs?.[0];
      if (!lead || typeof lead !== "string") return false;
      return !ACME_MARKERS.some((m) => lead.toLowerCase().includes(m));
    })
    .map((row) => ({
      manufacturer: (row.manufacturer as string | null) ?? null,
      category: (row.category as string | null) ?? null,
      color: (row.color as string | null) ?? null,
      material: (row.material as string | null) ?? null,
      collection: (row.collection as string | null) ?? null,
      price: row.price != null ? Number(row.price) : null,
      in_stock: row.in_stock != null ? Boolean(row.in_stock) : null,
      on_sale: row.on_sale != null ? Boolean(row.on_sale) : null,
    }));
}
