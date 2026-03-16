import { createAdminClient } from "./admin";
import type { Product } from "@/types";

export function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    sku: row.sku != null ? (row.sku as string) : undefined,
    description: row.description as string,
    price: Number(row.price),
    compare_price: row.compare_price != null ? Number(row.compare_price) : undefined,
    sale_price: row.sale_price != null ? Number(row.sale_price) : undefined,
    on_sale: Boolean(row.on_sale),
    images: (row.images as string[]) ?? [],
    category: row.category as string,
    in_stock: row.in_stock === false ? false : true,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    tags: (row.tags as string[]) ?? [],
    created_at: row.created_at as string,
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true })
    .limit(300); // Covers 291 products; increase if catalog grows

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  return (data ?? []).map(mapRowToProduct);
}

export async function getProductsInCategory(
  category: string,
  limit: number
): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getProductsInCategory error:", error);
    return [];
  }
  return (data ?? []).map(mapRowToProduct);
}

export async function getProductCountByCategory(
  category: string
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category", category);

  if (error) {
    console.error("getProductCountByCategory error:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getTotalProductCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("getTotalProductCount error:", error);
    return 0;
  }
  return count ?? 0;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  return mapRowToProduct(data);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createAdminClient();

  const categories = ["sofa", "bed", "table", "chair"];
  const products: Product[] = [];

  for (const category of categories) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .order("price", { ascending: false })
      .limit(2);

    if (error) {
      console.error("[getFeaturedProducts] Supabase error for category", category, ":", error.message, error.details);
      continue;
    }

    if (data && data.length > 0) {
      products.push(...data.map(mapRowToProduct));
    }
  }

  return products.slice(0, 8);
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];

  const supabase = createAdminClient();

  // Use full-text + fuzzy search via RPC if available, else fallback to ilike
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "search_products",
    { query_text: query.trim() }
  );

  if (!rpcError && Array.isArray(rpcData)) {
    return (rpcData as Record<string, unknown>[]).map(mapRowToProduct);
  }

  // Fallback: ilike on name (when search_vector/RPC not yet deployed)
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("searchProducts error:", error);
    return [];
  }

  return (data ?? []).map(mapRowToProduct);
}

// ── Homepage data fetchers ─────────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  headline: string;
  subheading: string | null;
  cta_label: string;
  cta_href: string;
  image_url: string;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, headline, subheading, cta_label, cta_href, image_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("getHeroSlides error:", error);
    return [];
  }
  return (data ?? []) as HeroSlide[];
}

export interface ManufacturerWithCount {
  name: string;
  slug: string;
  description: string;
  count: number;
  comingSoon: boolean;
}

export async function getManufacturersWithCounts(): Promise<ManufacturerWithCount[]> {
  const supabase = createAdminClient();

  const [{ data: mfrs }, { data: counts }] = await Promise.all([
    supabase
      .from("manufacturers")
      .select("name, slug, description, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("manufacturer")
      .not("manufacturer", "is", null),
  ]);

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const m = row.manufacturer as string;
    countMap.set(m, (countMap.get(m) ?? 0) + 1);
  }

  return (mfrs ?? []).map((m) => ({
    name: m.name as string,
    slug: m.slug as string,
    description: m.description as string,
    count: countMap.get(m.name as string) ?? 0,
    comingSoon: countMap.get(m.name as string) === 0,
  }));
}

export interface SpotlightProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
}

export async function getRugsSpotlight(): Promise<SpotlightProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, price, images")
    .eq("category", "rug")
    .eq("in_stock", true)
    .order("rating", { ascending: false })
    .limit(4);
  if (error) {
    console.error("getRugsSpotlight error:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    price: Number(r.price),
    images: (r.images as string[]) ?? [],
  }));
}
