import { createAdminClient } from "./admin";
import type { Product } from "@/types";

function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string,
    price: Number(row.price),
    compare_price: row.compare_price != null ? Number(row.compare_price) : undefined,
    images: (row.images as string[]) ?? [],
    category: row.category as string,
    in_stock: Boolean(row.in_stock),
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

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  return (data ?? []).map(mapRowToProduct);
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

  const categories = ["bed", "chair", "sofa", "table"];
  const products: Product[] = [];

  for (const category of categories) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .order("created_at", { ascending: false })
      .limit(2);

    if (error) {
      console.error("[getFeaturedProducts] Supabase error for category", category, ":", error.message, error.details);
      continue;
    }

    if (data && data.length > 0) {
      products.push(...data.map(mapRowToProduct));
    }
  }

  return products;
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("searchProducts error:", error);
    return [];
  }

  return (data ?? []).map(mapRowToProduct);
}
