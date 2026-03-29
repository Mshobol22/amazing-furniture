import { createAdminClient } from "./admin";
import { brandLogoSrc, proxyIfNfdManufacturer } from "@/lib/nfd-image-proxy";
import {
  extractZinatexSlugSuffix,
  normalizeZinatexVariationSkuForSlug,
} from "@/lib/zinatex-slug";
import type { Product } from "@/types";
import {
  applyZinatexListingVisibilityFilter,
  isZinatexListingVisibleRow,
  isZinatexSupersededListingRow,
} from "@/lib/zinatex-listing-filter";
import { getStorefrontListPrice } from "@/lib/zinatex-product-display";

export { applyZinatexListingVisibilityFilter, isZinatexListingVisibleRow, isZinatexSupersededListingRow };

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
    manufacturer: row.manufacturer != null ? (row.manufacturer as string) : null,
    acme_product_type:
      row.acme_product_type == null || String(row.acme_product_type).trim() === ""
        ? null
        : String(row.acme_product_type).trim(),
    acme_kit_parent_sku:
      row.acme_kit_parent_sku == null || String(row.acme_kit_parent_sku).trim() === ""
        ? null
        : String(row.acme_kit_parent_sku).trim(),
    acme_color_group:
      row.acme_color_group == null || String(row.acme_color_group).trim() === ""
        ? null
        : String(row.acme_color_group).trim(),
    display_name:
      row.display_name == null || String(row.display_name).trim() === ""
        ? null
        : String(row.display_name).trim(),
    finish:
      row.finish == null || String(row.finish).trim() === ""
        ? null
        : String(row.finish).trim(),
    catalog_size:
      row.catalog_size == null || String(row.catalog_size).trim() === ""
        ? null
        : String(row.catalog_size).trim(),
    product_details:
      row.product_details == null || String(row.product_details).trim() === ""
        ? null
        : String(row.product_details).trim(),
    collection: row.collection != null ? (row.collection as string) : null,
    subcategory:
      row.subcategory == null || String(row.subcategory).trim() === ""
        ? null
        : String(row.subcategory).trim(),
    has_variants:
      row.has_variants === null || row.has_variants === undefined
        ? undefined
        : Boolean(row.has_variants),
    variant_type: row.variant_type != null ? (row.variant_type as string) : null,
    collection_group: row.collection_group != null ? (row.collection_group as string) : null,
    piece_type: row.piece_type != null ? (row.piece_type as string) : null,
    is_collection_hero: Boolean(row.is_collection_hero),
    bundle_skus: (row.bundle_skus as string[]) ?? [],
    page_id:
      row.page_id == null || String(row.page_id).trim() === ""
        ? null
        : String(row.page_id).trim(),
    page_features: (() => {
      const pf = row.page_features;
      if (!Array.isArray(pf) || pf.length === 0) return null;
      const cleaned = (pf as unknown[])
        .map((s) => String(s).trim())
        .filter(Boolean);
      return cleaned.length > 0 ? cleaned : null;
    })(),
    images_validated:
      row.images_validated == null ? null : Boolean(row.images_validated),
    color: row.color != null ? (row.color as string) : null,
  };
}

// Hide ACME placeholder/coming-soon products from all public store browsing.
// These products have placeholder text inside lead image URLs
// such as "coming-soon" / "PHOTO-Coming-Soon" / "placeholder", but they
// should not appear in collection/category listings, search results, or
// homepage carousels until real ACME images are loaded.
const ACME_PLACEHOLDER_IMAGE_MARKERS = ["coming-soon", "placeholder"];

export function isHiddenAcmePlaceholderProduct(product: Pick<Product, "images">): boolean {
  const leadImageUrl = product.images?.[0] ?? "";
  const urlLower = typeof leadImageUrl === "string" ? leadImageUrl.toLowerCase() : "";
  return ACME_PLACEHOLDER_IMAGE_MARKERS.some((m) => urlLower.includes(m));
}

function hasValidLeadImage(images: string[] | null | undefined): boolean {
  if (!Array.isArray(images) || images.length === 0) return false;
  const leadImageUrl = images[0];
  if (typeof leadImageUrl !== "string" || leadImageUrl.length === 0) return false;
  const urlLower = leadImageUrl.toLowerCase();
  return !ACME_PLACEHOLDER_IMAGE_MARKERS.some((m) => urlLower.includes(m));
}

function filterRowsWithValidLeadImage<T extends { images?: string[] | null }>(rows: T[]): T[] {
  return rows.filter((row) => hasValidLeadImage(row.images));
}

export function applyAcmePlaceholderImageFilter(query: any): any {
  return query
    .not("images", "is", null);
}

/**
 * Hide ACME KIT components from public listings (category, brand, search, reels).
 * PDP and direct fetch by slug are unchanged — do not apply on single-product loads.
 * SQL: NOT (manufacturer = 'ACME' AND acme_product_type = 'component')
 */
export function applyAcmeComponentListingFilter(query: any): any {
  return query.or(
    "manufacturer.neq.ACME,acme_product_type.is.null,acme_product_type.neq.component"
  );
}

export function isHiddenAcmeComponentProduct(
  product: Pick<Product, "manufacturer" | "acme_product_type">
): boolean {
  return (
    product.manufacturer === "ACME" &&
    String(product.acme_product_type ?? "").trim() === "component"
  );
}

const VARIANT_FROM_PRICE_CHUNK = 100;

/**
 * Sets `variant_from_price` on every parent with `has_variants` (min in-stock variant
 * price, else min any variant). Zinatex rows also get `zinatex_from_price` for compatibility.
 */
export async function attachVariantFromPrices(products: Product[]): Promise<Product[]> {
  const parentIds = products.filter((p) => p.has_variants === true).map((p) => p.id);
  if (parentIds.length === 0) return products;

  const supabase = createAdminClient();
  const inStockMin = new Map<string, number>();
  const anyMin = new Map<string, number>();

  for (let i = 0; i < parentIds.length; i += VARIANT_FROM_PRICE_CHUNK) {
    const chunk = parentIds.slice(i, i + VARIANT_FROM_PRICE_CHUNK);
    const { data, error } = await supabase
      .from("product_variants")
      .select("product_id, price, in_stock")
      .in("product_id", chunk);
    if (error) {
      console.error("attachVariantFromPrices error:", error);
      continue;
    }
    for (const row of data ?? []) {
      const pid = row.product_id as string;
      const pr = Number(row.price);
      if (!Number.isFinite(pr)) continue;
      const prevAny = anyMin.get(pid);
      if (prevAny === undefined || pr < prevAny) anyMin.set(pid, pr);
      if (row.in_stock === true) {
        const prev = inStockMin.get(pid);
        if (prev === undefined || pr < prev) inStockMin.set(pid, pr);
      }
    }
  }

  return products.map((p) => {
    if (p.has_variants !== true) return p;
    const from = inStockMin.get(p.id) ?? anyMin.get(p.id);
    if (from === undefined) return p;
    const next: Product = { ...p, variant_from_price: from };
    if (p.manufacturer === "Zinatex") {
      next.zinatex_from_price = from;
    }
    return next;
  });
}

/** @deprecated Use `attachVariantFromPrices` (same implementation). */
export const attachZinatexFromPrices = attachVariantFromPrices;

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

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error) {
    console.error("getProducts error:", error);
    return [];
  }

  const mapped = (data ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));
  return attachZinatexFromPrices(mapped);
}

export async function getProductsInCategory(
  category: string,
  limit: number
): Promise<Product[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .order("name", { ascending: true })
    .limit(limit);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error) {
    console.error("getProductsInCategory error:", error);
    return [];
  }
  const mapped = (data ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p));
  return attachZinatexFromPrices(mapped);
}

export async function getProductCountByCategory(
  category: string
): Promise<number> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("images")
    .eq("category", category);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error) {
    console.error("getProductCountByCategory error:", error);
    return 0;
  }
  return filterRowsWithValidLeadImage((data ?? []) as { images?: string[] | null }[]).length;
}

export async function getTotalProductCount(): Promise<number> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("images");

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error) {
    console.error("getTotalProductCount error:", error);
    return 0;
  }
  return filterRowsWithValidLeadImage((data ?? []) as { images?: string[] | null }[]).length;
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

/**
 * Legacy Zinatex URLs used /products/[slug] where slug embedded the full Variation SKU
 * (e.g. …-ztx-99903-beige-10x13). After variant migration only the parent row remains;
 * resolve via product_variants.sku and redirect to the parent slug.
 */
async function findZinatexProductByLegacyVariantSlug(
  slug: string
): Promise<Product | null> {
  const suffix = extractZinatexSlugSuffix(slug);
  if (!suffix) return null;

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("product_variants")
    .select("product_id, sku, products!inner(manufacturer)")
    .eq("products.manufacturer", "Zinatex");

  if (error || !rows?.length) return null;

  const hit = rows.find(
    (r: { sku: string }) =>
      normalizeZinatexVariationSkuForSlug(r.sku) === suffix
  );
  if (!hit) return null;

  const { data: productRow, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", (hit as { product_id: string }).product_id)
    .single();

  if (pErr || !productRow) return null;
  return mapRowToProduct(productRow as Record<string, unknown>);
}

export type ResolveProductPageSlugResult =
  | { ok: true; product: Product; redirectToSlug?: string }
  | { ok: false };

export async function resolveProductPageSlug(
  slug: string
): Promise<ResolveProductPageSlugResult> {
  const direct = await getProductBySlug(slug);
  if (direct) {
    return { ok: true, product: direct };
  }

  const legacy = await findZinatexProductByLegacyVariantSlug(slug);
  if (!legacy) return { ok: false };

  if (legacy.slug !== slug) {
    return { ok: true, product: legacy, redirectToSlug: legacy.slug };
  }
  return { ok: true, product: legacy };
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createAdminClient();

  const categories = ["sofa", "bed", "table", "chair"];
  const products: Product[] = [];

  for (const category of categories) {
    let query = supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .order("price", { ascending: false })
      .limit(2);

    query = applyAcmePlaceholderImageFilter(query);
    query = applyAcmeComponentListingFilter(query);

    const { data, error } = await query;

    if (error) {
      console.error("[getFeaturedProducts] Supabase error for category", category, ":", error.message, error.details);
      continue;
    }

    if (data && data.length > 0) {
      const filteredRows = filterRowsWithValidLeadImage(data as { images?: string[] | null }[]);
      products.push(
        ...filteredRows
          .map(mapRowToProduct)
          .filter((p) => !isHiddenAcmePlaceholderProduct(p))
          .filter((p) => !isHiddenAcmeComponentProduct(p))
      );
    }
  }

  return attachVariantFromPrices(products.slice(0, 8));
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
    const visibleRows = (rpcData as Record<string, unknown>[]).filter((r) =>
      isZinatexListingVisibleRow({
        manufacturer: r.manufacturer as string | null | undefined,
        has_variants: r.has_variants as boolean | null | undefined,
        in_stock: r.in_stock as boolean | null | undefined,
      })
    );
    const filteredRows = filterRowsWithValidLeadImage(
      visibleRows.map((r) => ({
        ...r,
        images: (r.images as string[] | null | undefined) ?? [],
      }))
    );
    const mapped = filteredRows
      .map(mapRowToProduct)
      .filter((p) => !isHiddenAcmePlaceholderProduct(p))
      .filter((p) => !isHiddenAcmeComponentProduct(p));
    return attachZinatexFromPrices(mapped);
  }

  // Fallback: ilike on name (when search_vector/RPC not yet deployed)
  let queryBuilder = supabase
    .from("products")
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .order("created_at", { ascending: false })
    .limit(15);

  queryBuilder = applyAcmePlaceholderImageFilter(queryBuilder);
  queryBuilder = applyZinatexListingVisibilityFilter(queryBuilder);
  queryBuilder = applyAcmeComponentListingFilter(queryBuilder);

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("searchProducts error:", error);
    return [];
  }

  const mapped = (data ?? [])
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  return attachZinatexFromPrices(mapped);
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
  logo_url: string | null;
  backgroundImage: string | null;
  is_active: boolean;
  count: number;
  product_count: number;
  comingSoon: boolean;
}

/** Homepage manufacturers: server-side via `get_manufacturers_with_counts` RPC. */
export async function getManufacturersWithCounts(): Promise<ManufacturerWithCount[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc("get_manufacturers_with_counts");

  if (error) {
    console.error("getManufacturersWithCounts error:", error);
    return [];
  }

  return data ?? [];
}

export interface CategoryImage {
  slug: string;
  image: string | null;
}

export async function getCategoryImages(): Promise<CategoryImage[]> {
  const supabase = createAdminClient();
  const categorySlugs = ["sofa", "bedroom", "chair", "table", "cabinet", "tv-stand", "rug", "other"];

  async function getLeadImageForCategory(
    slug: string,
    options?: {
      includeManufacturer?: string;
      excludeManufacturer?: string;
    }
  ): Promise<string | null> {
    let query = supabase
      .from("products")
      .select("images")
      .eq("in_stock", true)
      .not("images", "is", null)
      .not("images", "eq", "{}")
      .limit(20);

    if (slug === "bedroom") {
      query = query.in("category", ["bed", "bedroom-furniture"]);
    } else {
      query = query.eq("category", slug);
    }

    if (options?.includeManufacturer) {
      query = query.eq("manufacturer", options.includeManufacturer);
    }
    if (options?.excludeManufacturer) {
      query = query.neq("manufacturer", options.excludeManufacturer);
    }

    query = applyZinatexListingVisibilityFilter(query);
    query = applyAcmeComponentListingFilter(query);

    const { data, error } = await query;
    if (error) {
      console.error("getCategoryImages query error:", error);
      return null;
    }

    // Find first product whose lead image is a valid https:// URL
    for (const row of data ?? []) {
      const images = row.images as string[] | null;
      if (!Array.isArray(images) || images.length === 0) continue;

      // Hide placeholder/coming-soon lead images.
      if (isHiddenAcmePlaceholderProduct({ images })) continue;

      if (images[0].startsWith("https://")) {
        return images[0];
      }
    }

    return null;
  }

  const imagesBySlug = await Promise.all(
    categorySlugs.map(async (slug) => {
      if (slug === "bedroom") {
        const preferred = await getLeadImageForCategory(slug, { excludeManufacturer: "ACME" });
        if (preferred) return { slug, image: preferred };
        const fallback = await getLeadImageForCategory(slug);
        return { slug, image: fallback };
      }

      if (slug === "rug") {
        const zinatexImage = await getLeadImageForCategory(slug, { includeManufacturer: "Zinatex" });
        return { slug, image: zinatexImage };
      }

      const defaultImage = await getLeadImageForCategory(slug);
      return { slug, image: defaultImage };
    })
  );

  return imagesBySlug;
}

// ── Sale products ─────────────────────────────────────────────────────────

export async function getSaleProducts(limit = 8): Promise<Product[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("on_sale", true)
    .not("sale_price", "is", null)
    .gt("sale_price", 0)
    .order("price", { ascending: false })
    .limit(limit);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const listed = data
    .map(mapRowToProduct)
    .filter(
      (p) =>
        !isHiddenAcmePlaceholderProduct(p) &&
        !isHiddenAcmeComponentProduct(p) &&
        p.sale_price != null &&
        p.sale_price < p.price
    );
  return attachVariantFromPrices(listed);
}

// ── Brand page data fetchers ──────────────────────────────────────────────

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
}

export async function getManufacturerBySlug(slug: string): Promise<Manufacturer | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("manufacturers")
    .select("id, name, slug, description, logo_url, is_active")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  const row = data as Manufacturer;
  return {
    ...row,
    logo_url: brandLogoSrc(row.name, row.logo_url),
  };
}

export async function getProductsByManufacturer(
  manufacturerName: string,
  category?: string,
  limit = 15,
  offset = 0
): Promise<{ products: Product[]; total: number }> {
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("manufacturer", manufacturerName)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);
  query = applyZinatexListingVisibilityFilter(query);

  const { data, error, count } = await query;

  if (error) {
    console.error("getProductsByManufacturer error:", error);
    return { products: [], total: 0 };
  }

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { images?: string[] | null }[]);
  const mapped = filteredRows
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  const products = await attachVariantFromPrices(mapped);
  return {
    products,
    total: filteredRows.length,
  };
}

export async function getManufacturerCategories(
  manufacturerName: string
): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("category, images")
    .eq("manufacturer", manufacturerName);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { category?: string; images?: string[] | null }[]);
  const unique = Array.from(new Set(filteredRows.map((r) => r.category as string))).sort();
  return unique;
}

// ── Collection page initial product fetch ─────────────────────────────────

export async function getInitialCollectionProducts(
  category: string
): Promise<{ products: Product[]; total: number }> {
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(0, 14);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);
  query = applyZinatexListingVisibilityFilter(query);

  const { data, count, error } = await query;
  if (error) {
    console.error("getInitialCollectionProducts error:", error);
    return { products: [], total: 0 };
  }

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { images?: string[] | null }[]);
  const mapped = filteredRows
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  const products = await attachVariantFromPrices(mapped);
  return {
    products,
    total: filteredRows.length,
  };
}

// ── Collection page filter data fetchers ──────────────────────────────────

export interface ManufacturerCount {
  name: string;
  count: number;
}

export interface SubcategoryCount {
  name: string;
  count: number;
}

export async function getCategoryManufacturerCounts(
  category: string
): Promise<ManufacturerCount[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("manufacturer, images")
    .not("manufacturer", "is", null);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { manufacturer?: string; images?: string[] | null }[]);
  const counts = new Map<string, number>();
  for (const row of filteredRows) {
    const name = row.manufacturer as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getCategoryCollections(
  category: string
): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("collection, images")
    .not("collection", "is", null);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { collection?: string; images?: string[] | null }[]);
  const unique = Array.from(
    new Set(filteredRows.map((r) => r.collection as string).filter(Boolean))
  ).sort();
  return unique;
}

export async function getCategoryColors(category: string): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("color, images")
    .not("color", "is", null);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  if (category === "rug") {
    // Rug colors are comma-separated — extract individual color names
    const colors = new Set<string>();
    const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { color?: string; images?: string[] | null }[]);
    for (const row of filteredRows) {
      const raw = row.color as string;
      raw.split(",").forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) colors.add(trimmed);
      });
    }
    return Array.from(colors).sort();
  }

  const unique = Array.from(
    new Set(
      filterRowsWithValidLeadImage((data ?? []) as { color?: string; images?: string[] | null }[])
        .map((r) => r.color as string)
        .filter(Boolean)
    )
  ).sort();
  return unique;
}

export async function getCategorySizes(category: string): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("dimensions, images")
    .not("dimensions", "is", null);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  const sizes = new Set<string>();
  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { dimensions?: Record<string, unknown> | null; images?: string[] | null }[]);
  for (const row of filteredRows) {
    const dims = row.dimensions as Record<string, unknown> | null;
    if (dims && typeof dims.size === "string") {
      sizes.add(dims.size);
    }
  }
  return Array.from(sizes).sort();
}

export async function getCategorySubcategories(
  category: string
): Promise<SubcategoryCount[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("subcategory, images")
    .not("subcategory", "is", null);

  if (category !== "all") {
    query = query.eq("category", category);
  }

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { subcategory?: string; images?: string[] | null }[]);
  const counts: Record<string, number> = {};
  for (const row of filteredRows) {
    const sub = row.subcategory as string;
    if (sub) counts[sub] = (counts[sub] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Type counts for merged `/collections/bedroom` (bed + bedroom-furniture, single query — no duplicate products). */
export async function getMergedBedroomSubcategories(): Promise<SubcategoryCount[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("subcategory, images")
    .in("category", ["bed", "bedroom-furniture"])
    .not("subcategory", "is", null);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage(
    (data ?? []) as { subcategory?: string; images?: string[] | null }[]
  );
  const counts: Record<string, number> = {};
  for (const row of filteredRows) {
    const sub = row.subcategory as string;
    if (sub) counts[sub] = (counts[sub] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getManufacturerSubcategories(
  manufacturerName: string
): Promise<SubcategoryCount[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("subcategory, images")
    .eq("manufacturer", manufacturerName)
    .not("subcategory", "is", null);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { subcategory?: string; images?: string[] | null }[]);
  const counts: Record<string, number> = {};
  for (const row of filteredRows) {
    const sub = row.subcategory as string;
    if (sub) counts[sub] = (counts[sub] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getManufacturerCollections(
  manufacturerName: string
): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("collection, images")
    .eq("manufacturer", manufacturerName)
    .not("collection", "is", null);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { collection?: string; images?: string[] | null }[]);
  const unique = Array.from(
    new Set(filteredRows.map((r) => r.collection as string).filter(Boolean))
  ).sort();
  return unique;
}

export async function getManufacturerColors(
  manufacturerName: string
): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("color, images")
    .eq("manufacturer", manufacturerName)
    .not("color", "is", null);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { color?: string; images?: string[] | null }[]);
  const unique = Array.from(
    new Set(filteredRows.map((r) => r.color as string).filter(Boolean))
  ).sort();
  return unique;
}

export async function getManufacturerSizes(
  manufacturerName: string
): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("dimensions, images")
    .eq("manufacturer", manufacturerName)
    .not("dimensions", "is", null);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;

  if (error || !data) return [];

  const sizes = new Set<string>();
  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { dimensions?: Record<string, unknown> | null; images?: string[] | null }[]);
  for (const row of filteredRows) {
    const dims = row.dimensions as Record<string, unknown> | null;
    if (dims && typeof dims.size === "string") {
      sizes.add(dims.size);
    }
  }
  return Array.from(sizes).sort();
}

export interface FilteredProductsParams {
  manufacturerName: string;
  category?: string;
  categories?: string[];
  collections?: string[];
  colors?: string[];
  sizes?: string[];
  subcategories?: string[];
  inStockOnly?: boolean;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  sort?: string;
}

export async function getFilteredProducts(
  params: FilteredProductsParams
): Promise<{ products: Product[]; total: number }> {
  const supabase = createAdminClient();
  const limit = params.limit ?? 15;
  const offset = params.offset ?? 0;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("manufacturer", params.manufacturerName);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  // Single category filter (backward compat)
  if (params.category && params.category !== "all") {
    query = query.eq("category", params.category);
  }

  // Multi-category filter
  if (params.categories && params.categories.length > 0) {
    query = query.in("category", params.categories);
  }

  // Collection filter
  if (params.collections && params.collections.length > 0) {
    query = query.in("collection", params.collections);
  }

  // Color filter
  if (params.colors && params.colors.length > 0) {
    query = query.in("color", params.colors);
  }

  // Subcategory (type) filter
  if (params.subcategories && params.subcategories.length > 0) {
    query = query.in("subcategory", params.subcategories);
  }

  // In-stock filter
  if (params.inStockOnly) {
    query = query.eq("in_stock", true);
  }

  // Price range
  if (params.priceMin != null && params.priceMin > 0) {
    query = query.gte("price", params.priceMin);
  }
  if (params.priceMax != null && params.priceMax > 0) {
    query = query.lte("price", params.priceMax);
  }

  // Sort
  switch (params.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("getFilteredProducts error:", error);
    return { products: [], total: 0 };
  }

  // Handle sizes filter client-side (JSONB field)
  const filteredRows = filterRowsWithValidLeadImage((data ?? []) as { images?: string[] | null }[]);
  let products = filteredRows
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  if (params.sizes && params.sizes.length > 0) {
    const sizeSet = new Set(params.sizes);
    products = products.filter((p) => {
      const raw = (data ?? []).find((d) => d.id === p.id);
      const dims = raw?.dimensions as Record<string, unknown> | null;
      return dims && typeof dims.size === "string" && sizeSet.has(dims.size);
    });
  }

  products = await attachZinatexFromPrices(products);

  const total =
    params.sizes && params.sizes.length > 0 ? products.length : (count ?? 0);

  return {
    products,
    total,
  };
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
  let query = supabase
    .from("products")
    .select("*")
    .eq("category", "rug")
    .eq("in_stock", true)
    .order("rating", { ascending: false })
    .limit(40);

  query = applyAcmePlaceholderImageFilter(query);
  query = applyZinatexListingVisibilityFilter(query);
  query = applyAcmeComponentListingFilter(query);

  const { data, error } = await query;
  if (error) {
    console.error("getRugsSpotlight error:", error);
    return [];
  }
  const rows = (data ?? []) as Array<Record<string, unknown> & { images?: string[] | null }>;
  const candidates = filterRowsWithValidLeadImage(rows)
    .map(mapRowToProduct)
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
    .filter((p) => !isHiddenAcmeComponentProduct(p));
  const enriched = await attachZinatexFromPrices(candidates);
  return enriched.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: getStorefrontListPrice(p),
    images: p.images ?? [],
    manufacturer: p.manufacturer,
  }));
}

/** Parent KIT row for a component's `acme_kit_parent_sku` (ACME only). */
export async function getAcmeKitParentProductBySku(
  parentSku: string
): Promise<Product | null> {
  const sku = parentSku.trim();
  if (!sku) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("manufacturer", "ACME")
    .eq("sku", sku);

  if (error || !data?.length) {
    if (error) console.error("getAcmeKitParentProductBySku error:", error);
    return null;
  }

  const kitRow = data.find(
    (r) =>
      String((r as { acme_product_type?: string }).acme_product_type ?? "").trim() ===
      "kit"
  );
  const row = kitRow ?? data[0];
  return mapRowToProduct(row as Record<string, unknown>);
}

/** Other component SKUs sharing the same KIT parent (excludes `product.id`). */
export async function getAcmeKitSiblingComponents(
  product: Pick<Product, "id" | "acme_kit_parent_sku">
): Promise<Product[]> {
  const parent = String(product.acme_kit_parent_sku ?? "").trim();
  if (!parent) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("acme_kit_parent_sku", parent)
    .neq("id", product.id)
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) console.error("getAcmeKitSiblingComponents error:", error);
    return [];
  }

  return data.map((row) => mapRowToProduct(row as Record<string, unknown>));
}

/** Component rows linked to a KIT via `acme_kit_parent_sku` (PDP "What's in this set"). */
export async function getAcmeKitComponentProducts(
  parentSku: string
): Promise<Product[]> {
  const sku = parentSku.trim();
  if (!sku) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("acme_kit_parent_sku", sku)
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) console.error("getAcmeKitComponentProducts error:", error);
    return [];
  }

  return data.map((row) => mapRowToProduct(row as Record<string, unknown>));
}

/** All ACME rows sharing a color group (each slug = one finish variant). */
export async function getAcmeColorGroupVariantProducts(
  colorGroup: string
): Promise<Product[]> {
  const g = colorGroup.trim();
  if (!g) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("manufacturer", "ACME")
    .eq("acme_color_group", g)
    .order("finish", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) {
    if (error) console.error("getAcmeColorGroupVariantProducts error:", error);
    return [];
  }

  const mapped = data.map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  );
  return attachVariantFromPrices(mapped);
}

/** Same ACME collection as the KIT, excluding components and the current product (max 8). */
export async function getAcmeKitCollectionSiblings(
  product: Pick<Product, "id" | "collection" | "manufacturer">
): Promise<Product[]> {
  if (product.manufacturer !== "ACME") return [];
  const coll = product.collection != null ? String(product.collection).trim() : "";
  if (!coll) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("manufacturer", "ACME")
    .eq("collection", coll)
    .neq("id", product.id)
    .or("acme_product_type.is.null,acme_product_type.neq.component")
    .order("name", { ascending: true })
    .limit(8);

  if (error || !data) {
    if (error) console.error("getAcmeKitCollectionSiblings error:", error);
    return [];
  }

  const mapped = data.map((row) =>
    mapRowToProduct(row as Record<string, unknown>)
  );
  return attachVariantFromPrices(mapped);
}
