/** Merged storefront collection: beds + bedroom furniture (single sidebar, no duplicate rows). */
export const BEDROOM_MERGED_SLUG = "bedroom";
export const BEDROOM_SOURCE_CATEGORIES = ["bed", "bedroom-furniture"] as const;

export function isBedroomMergedSlug(slug: string): boolean {
  return slug === BEDROOM_MERGED_SLUG;
}

/**
 * Apply `category` filter for collection / filter-option queries.
 * `bedroom` → `category IN ('bed','bedroom-furniture')` (each product appears once).
 */
export function applyStorefrontCollectionCategoryFilter(query: any, slug: string): any {
  if (slug === "all") return query;
  if (isBedroomMergedSlug(slug)) {
    return query.in("category", [...BEDROOM_SOURCE_CATEGORIES]);
  }
  return query.eq("category", slug);
}
