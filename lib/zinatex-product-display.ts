import type { Product } from "@/types";

export function isZinatexProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "Zinatex";
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
