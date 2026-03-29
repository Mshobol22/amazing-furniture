import {
  BEDROOM_MERGED_SLUG,
  BEDROOM_SOURCE_CATEGORIES,
} from "@/lib/collections/collection-scope";

const PAGE_SIZE = 50;

/** Avoid breaking PostgREST `or()` comma-separated filter syntax */
export function sanitizeAdminSearchToken(q: string): string {
  return q.replace(/,/g, " ").trim();
}

/** Strip ILIKE wildcards from user input (PostgREST does not use ESCAPE by default). */
export function stripIlikeWildcards(token: string): string {
  return token.replace(/%/g, "").replace(/_/g, "");
}

export type AdminCatalogSort =
  | "default"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "newest";

export type AdminCatalogFilters = {
  q: string;
  manufacturer: string | null;
  category: string | null;
  stock: "in_stock" | "out_of_stock" | null;
  sort: AdminCatalogSort;
  page: number;
};

export function parseAdminCatalogSearchParams(sp: URLSearchParams): AdminCatalogFilters {
  const pageRaw = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const q = sanitizeAdminSearchToken(sp.get("q") ?? "");
  const manufacturer = sp.get("manufacturer")?.trim() || null;
  const category = sp.get("category")?.trim() || null;
  const stockRaw = sp.get("stock");
  const stock =
    stockRaw === "in_stock" || stockRaw === "out_of_stock" ? stockRaw : null;
  const sortRaw = sp.get("sort") ?? "default";
  const sort: AdminCatalogSort =
    sortRaw === "price-asc" ||
    sortRaw === "price-desc" ||
    sortRaw === "name-asc" ||
    sortRaw === "newest"
      ? sortRaw
      : "default";

  return { q, manufacturer, category, stock, sort, page };
}

/** Loose Supabase query builder chain (count head + select *). */
type AdminProductsQuery = any;

/** Applies admin catalog filters (ANDed). Search uses OR on name + sku. */
export function applyAdminCatalogFilters(
  base: AdminProductsQuery,
  f: Pick<AdminCatalogFilters, "q" | "manufacturer" | "category" | "stock">
): AdminProductsQuery {
  let query = base;

  const searchCore = stripIlikeWildcards(f.q);
  if (searchCore.length > 0) {
    const pattern = `%${searchCore}%`;
    query = query.or(`name.ilike.${pattern},sku.ilike.${pattern}`);
  }

  if (f.manufacturer) {
    if (f.manufacturer === "Unknown") {
      query = query.or("manufacturer.is.null,manufacturer.eq.,manufacturer.eq.Unknown");
    } else {
      query = query.eq("manufacturer", f.manufacturer);
    }
  }

  if (f.category) {
    if (f.category === "Uncategorized") {
      query = query.or("category.is.null,category.eq.");
    } else if (f.category === BEDROOM_MERGED_SLUG) {
      query = query.in("category", [...BEDROOM_SOURCE_CATEGORIES]);
    } else {
      query = query.eq("category", f.category);
    }
  }

  if (f.stock === "in_stock") {
    query = query.eq("in_stock", true);
  } else if (f.stock === "out_of_stock") {
    query = query.eq("in_stock", false);
  }

  return query;
}

export function orderAdminCatalog(
  query: AdminProductsQuery,
  sort: AdminCatalogSort
): AdminProductsQuery {
  switch (sort) {
    case "price-asc":
      return query.order("price", { ascending: true });
    case "price-desc":
      return query.order("price", { ascending: false });
    case "name-asc":
      return query.order("name", { ascending: true });
    case "newest":
      return query.order("created_at", { ascending: false });
    default:
      return query.order("name", { ascending: true });
  }
}

export { PAGE_SIZE };
