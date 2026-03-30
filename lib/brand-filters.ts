import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";
import {
  applyAcmeComponentListingFilter,
  applyAcmePlaceholderImageFilter,
  isHiddenAcmePlaceholderProduct,
  isHiddenAcmeComponentProduct,
  mapRowToProduct,
} from "@/lib/supabase/products";
import { applyZinatexListingVisibilityFilter } from "@/lib/zinatex-listing-filter";

/** Min variant prices need service role; hydrate after anon `products` query. */
async function enrichProductsWithVariantPrices(
  products: Product[]
): Promise<Product[]> {
  if (typeof window === "undefined" || products.length === 0) return products;
  try {
    const res = await fetch("/api/products/by-ids", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: products.map((p) => p.id) }),
    });
    if (!res.ok) return products;
    const body = (await res.json()) as { products?: Product[] };
    const byId = new Map((body.products ?? []).map((p) => [p.id, p]));
    return products.map((p) => byId.get(p.id) ?? p);
  } catch {
    return products;
  }
}

type ValueCount = { value: string; count: number };

function normalizeManufacturerForProducts(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "acme") return "ACME";
  if (value === "nationwide fd" || value === "nationwide-fd") return "Nationwide FD";
  if (value === "united furniture" || value === "united-furniture") return "United Furniture";
  if (value === "zinatex") return "Zinatex";
  return raw;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function aggregateCounts(rows: Array<Record<string, unknown>>, key: string): ValueCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = normalizeText(row[key]);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export async function fetchBrandCategories(
  manufacturer: string,
  field: "category" | "collection" = "category"
): Promise<ValueCount[]> {
  const supabase = createClient();
  const manufacturerName = normalizeManufacturerForProducts(manufacturer);
  let q = supabase
    .from("products")
    .select(field)
    .eq("manufacturer", manufacturerName)
    .eq("in_stock", true);
  q = applyAcmeComponentListingFilter(q);
  const { data, error } = await q;

  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, field);
}

export async function fetchBrandCollections(
  manufacturer: string,
  category: string
): Promise<ValueCount[]> {
  const supabase = createClient();
  const manufacturerName = normalizeManufacturerForProducts(manufacturer);
  let query = supabase
    .from("products")
    .select("collection")
    .eq("manufacturer", manufacturerName)
    .eq("category", category)
    .eq("in_stock", true);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "collection");
}

export async function fetchAllManufacturers(): Promise<ValueCount[]> {
  const supabase = createClient();
  let query = supabase.from("products").select("manufacturer").eq("in_stock", true);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "manufacturer");
}

export async function fetchAllCategories(manufacturer?: string): Promise<ValueCount[]> {
  const supabase = createClient();
  let query = supabase.from("products").select("category").eq("in_stock", true);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);
  if (manufacturer) {
    query = query.eq("manufacturer", manufacturer);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "category");
}

/** Manufacturers that have in-stock products in the given category (for shop-all step 2). */
export async function fetchManufacturersForCategory(category: string): Promise<ValueCount[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("manufacturer")
    .eq("in_stock", true)
    .eq("category", category);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "manufacturer");
}

function splitDistinctValues(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function fetchColorsForFilters(params: {
  category?: string;
  manufacturer?: string;
  collection?: string;
}): Promise<string[]> {
  const supabase = createClient();
  let query = supabase.from("products").select("color").eq("in_stock", true);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  if (params.category) {
    query = query.eq("category", params.category);
  }

  if (params.manufacturer) {
    query = query.eq("manufacturer", params.manufacturer);
  }
  if (params.collection) {
    query = query.eq("collection", params.collection);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const unique = new Set<string>();
  for (const row of data as Array<Record<string, unknown>>) {
    const color = normalizeText(row.color);
    if (!color) continue;
    for (const item of splitDistinctValues(color)) {
      unique.add(item);
    }
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export async function fetchMaterialsForFilters(params: {
  category?: string;
  manufacturer?: string;
  collection?: string;
}): Promise<string[]> {
  const supabase = createClient();
  let query = supabase.from("products").select("material").eq("in_stock", true);
  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  if (params.category) {
    query = query.eq("category", params.category);
  }

  if (params.manufacturer) {
    query = query.eq("manufacturer", params.manufacturer);
  }
  if (params.collection) {
    query = query.eq("collection", params.collection);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const unique = new Set<string>();
  for (const row of data as Array<Record<string, unknown>>) {
    const material = normalizeText(row.material);
    if (material) unique.add(material);
  }

  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

export async function fetchBrandColors(
  manufacturer: string,
  category?: string,
  collection?: string
): Promise<string[]> {
  return fetchColorsForFilters({
    category,
    manufacturer: normalizeManufacturerForProducts(manufacturer),
    collection,
  });
}

export async function fetchBrandMaterials(
  manufacturer: string,
  category?: string,
  collection?: string
): Promise<string[]> {
  return fetchMaterialsForFilters({
    category,
    manufacturer: normalizeManufacturerForProducts(manufacturer),
    collection,
  });
}

interface FetchBrandProductsParams {
  manufacturer: string;
  category?: string;
  excludeCategory?: string;
  collection?: string;
  colors?: string[];
  material?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "default" | "price-asc" | "price-desc" | "name-asc";
  searchQuery?: string;
  page: number;
  perPage: number;
}

export async function fetchBrandProducts(
  params: FetchBrandProductsParams
): Promise<{ products: Product[]; total: number }> {
  const supabase = createClient();
  const manufacturerName = normalizeManufacturerForProducts(params.manufacturer);
  const page = Math.max(1, params.page);
  const perPage = Math.max(1, params.perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("manufacturer", manufacturerName)
    .eq("in_stock", true);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);
  query = applyZinatexListingVisibilityFilter(query);

  if (params.category) query = query.eq("category", params.category);
  if (params.excludeCategory) query = query.neq("category", params.excludeCategory);
  if (params.collection) query = query.eq("collection", params.collection);
  if (params.material) query = query.eq("material", params.material);
  if (params.colors && params.colors.length > 0) {
    const colorOr = params.colors.map((color) => `color.ilike.%${color}%`).join(",");
    query = query.or(colorOr);
  }
  if (params.priceMin != null) query = query.gte("price", params.priceMin);
  if (params.priceMax != null) query = query.lte("price", params.priceMax);
  if (params.searchQuery) query = query.ilike("name", `%${params.searchQuery}%`);

  switch (params.sort ?? "default") {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name-asc":
    case "default":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  const { data, error, count } = await query.range(start, end);
  if (error || !data) return { products: [], total: 0 };

  const products = data
    .map((row) => mapRowToProduct(row as Record<string, unknown>))
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));

  return {
    products: await enrichProductsWithVariantPrices(products),
    total: count ?? 0,
  };
}

export interface FetchAllProductsParams {
  manufacturer?: string;
  category?: string;
  collection?: string;
  colors?: string[];
  material?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "default" | "price-asc" | "price-desc" | "name-asc";
  searchQuery?: string;
  page: number;
  perPage: number;
}

export async function fetchAllProducts(
  params: FetchAllProductsParams
): Promise<{ products: Product[]; total: number }> {
  const supabase = createClient();
  const page = Math.max(1, params.page);
  const perPage = Math.max(1, params.perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("in_stock", true);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);
  query = applyZinatexListingVisibilityFilter(query);

  if (params.manufacturer) {
    query = query.eq("manufacturer", params.manufacturer);
  }
  if (params.category) {
    query = query.eq("category", params.category);
  }
  if (params.collection) {
    query = query.eq("collection", params.collection);
  }
  if (params.material) {
    query = query.eq("material", params.material);
  }
  if (params.colors && params.colors.length > 0) {
    const colorOr = params.colors.map((color) => `color.ilike.%${color}%`).join(",");
    query = query.or(colorOr);
  }
  if (params.priceMin != null) query = query.gte("price", params.priceMin);
  if (params.priceMax != null) query = query.lte("price", params.priceMax);
  if (params.searchQuery) {
    query = query.ilike("name", `%${params.searchQuery}%`);
  }

  switch (params.sort ?? "default") {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "name-asc":
    case "default":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  const { data, error, count } = await query.range(start, end);
  if (error || !data) return { products: [], total: 0 };

  const products = data
    .map((row) => mapRowToProduct(row as Record<string, unknown>))
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));

  return {
    products: await enrichProductsWithVariantPrices(products),
    total: count ?? 0,
  };
}
