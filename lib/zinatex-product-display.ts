import type { Product } from "@/types";

export function isZinatexProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "Zinatex";
}

/** Lowest variant list price for cards when parent has variants (any manufacturer). */
export function getVariantCardFromPrice(product: Product): number | null {
  if (product.has_variants !== true) return null;
  const v = product.variant_from_price ?? product.zinatex_from_price;
  if (v != null && Number.isFinite(v)) return v;
  return null;
}

/**
 * List price for storefront: min variant when `has_variants` and enriched, else `product.price`.
 */
export function getStorefrontListPrice(product: Product): number {
  const from = getVariantCardFromPrice(product);
  if (from != null) return from;
  return product.price;
}

/**
 * Card / PDP / reel label: rug design series (`collection`), else `subcategory`
 * (e.g. Large Rugs). Empty when both missing — caller may fall back to category badge.
 */
export function getZinatexListingLabel(product: Product): string {
  const col = product.collection != null ? String(product.collection).trim() : "";
  if (col) return col;
  const sub =
    product.subcategory != null ? String(product.subcategory).trim() : "";
  if (sub) return sub;
  return "";
}

/** Title line: stored `name` only (e.g. CASABLANCA Rug Design 10027). */
export function getZinatexProductDisplayName(product: Product): string {
  return product.name ?? "";
}

function categoryBadgeLabel(category: string): string {
  const labels: Record<string, string> = {
    bed: "BED",
    "bedroom-furniture": "BEDROOM FURNITURE",
    sofa: "SOFA",
    chair: "CHAIR",
    table: "TABLE",
    cabinet: "CABINET",
    "tv-stand": "TV STAND",
    rug: "RUG",
    other: "OTHER",
  };
  return labels[category] ?? category.replace(/-/g, " ").toUpperCase();
}

/** Label for cards/PDP: collection → subcategory → category badge (when both null). */
export function getZinatexCardListingLine(product: Product): string {
  const z = getZinatexListingLabel(product);
  if (z) return z;
  return categoryBadgeLabel(product.category);
}

/**
 * Rug PDP: when the product has no size variants, surface a single size from
 * `catalog_size` or `dimensions` (e.g. Zinatex `dimensions.size`).
 */
export function getStandaloneRugSizeLabel(
  product: Pick<Product, "category" | "has_variants" | "catalog_size" | "dimensions">
): string | null {
  if (product.category !== "rug") return null;
  if (product.has_variants === true) return null;

  const cs = product.catalog_size?.trim();
  if (cs) return cs;

  const d = product.dimensions;
  if (d && typeof d === "object") {
    const size = d.size;
    if (typeof size === "string" && size.trim()) return size.trim();
    const w = d.width;
    const l = d.length;
    const parts: string[] = [];
    if (typeof w === "string" && w.trim()) parts.push(w.trim());
    else if (typeof w === "number" && Number.isFinite(w)) parts.push(String(w));
    if (typeof l === "string" && l.trim()) parts.push(l.trim());
    else if (typeof l === "number" && Number.isFinite(l)) parts.push(String(l));
    if (parts.length > 0) return parts.join(" × ");
  }

  return null;
}
