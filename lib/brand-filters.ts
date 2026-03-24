import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/types";
import { mapRowToProduct } from "@/lib/supabase/products";

type ValueCount = { value: string; count: number };

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

export async function fetchBrandCategories(manufacturer: string): Promise<ValueCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("manufacturer", manufacturer)
    .eq("in_stock", true);

  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "category");
}

export async function fetchBrandCollections(
  manufacturer: string,
  category: string
): Promise<ValueCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("collection")
    .eq("manufacturer", manufacturer)
    .eq("category", category)
    .eq("in_stock", true);

  if (error || !data) return [];
  return aggregateCounts(data as Array<Record<string, unknown>>, "collection");
}

function splitDistinctValues(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function fetchBrandColors(
  manufacturer: string,
  category: string,
  collection?: string
): Promise<string[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("color")
    .eq("manufacturer", manufacturer)
    .eq("category", category)
    .eq("in_stock", true);

  if (collection) {
    query = query.eq("collection", collection);
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

export async function fetchBrandMaterials(
  manufacturer: string,
  category: string,
  collection?: string
): Promise<string[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("material")
    .eq("manufacturer", manufacturer)
    .eq("category", category)
    .eq("in_stock", true);

  if (collection) {
    query = query.eq("collection", collection);
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

interface FetchBrandProductsParams {
  manufacturer: string;
  category?: string;
  excludeCategory?: string;
  collection?: string;
  color?: string;
  material?: string;
  page: number;
  perPage: number;
}

export async function fetchBrandProducts(
  params: FetchBrandProductsParams
): Promise<{ products: Product[]; total: number }> {
  const supabase = createClient();
  const page = Math.max(1, params.page);
  const perPage = Math.max(1, params.perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("manufacturer", params.manufacturer)
    .eq("in_stock", true)
    .order("name", { ascending: true });

  if (params.category) query = query.eq("category", params.category);
  if (params.excludeCategory) query = query.neq("category", params.excludeCategory);
  if (params.collection) query = query.eq("collection", params.collection);
  if (params.material) query = query.eq("material", params.material);
  if (params.color) query = query.ilike("color", `%${params.color}%`);

  const { data, error, count } = await query.range(start, end);
  if (error || !data) return { products: [], total: 0 };

  return {
    products: data.map((row) => mapRowToProduct(row as Record<string, unknown>)),
    total: count ?? 0,
  };
}
