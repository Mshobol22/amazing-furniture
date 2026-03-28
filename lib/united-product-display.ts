import type { Product } from "@/types";

/** Space + em dash + space — matches NFD title separator */
const TITLE_SEP = " \u2014 ";

export function isUnitedFurnitureProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "United Furniture";
}

/** Category badge when `page_id` is missing — matches card/PDP category line */
function unitedCategoryBadgeLabel(category: string): string {
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

/**
 * Label above title (cards, PDP, reel): Page ID when set; otherwise category badge.
 */
export function getUnitedFurnitureListingLabel(product: Product): string {
  const pid = product.page_id != null ? String(product.page_id).trim() : "";
  if (pid) return pid;
  return unitedCategoryBadgeLabel(product.category);
}

function nonEmptyBundleSkus(product: Product): string[] {
  const raw = product.bundle_skus ?? [];
  return raw
    .map((s) => (s == null ? "" : String(s).trim()))
    .filter(Boolean);
}

/**
 * UF H1: `{description} — {bundle skus}` when bundle has pieces; else `{description}`.
 * Falls back to `name` (SKU) if description is empty.
 */
export function getUnitedFurnitureProductHeading(product: Product): string {
  const description = (product.description ?? "").trim();
  const base = description || (product.name ?? "").trim();
  const pieces = nonEmptyBundleSkus(product);
  if (pieces.length > 0) {
    return `${base}${TITLE_SEP}${pieces.join(", ")}`;
  }
  return base;
}

/** "Includes" when listing bundle pieces; "SKU" for the single-SKU line */
export function getUnitedFurnitureSkuLineKind(product: Product): "includes" | "sku" {
  return nonEmptyBundleSkus(product).length > 0 ? "includes" : "sku";
}

/** Comma-separated bundle SKUs, or primary sku / name for single-piece rows */
export function getUnitedFurnitureSkuLineValue(product: Product): string | null {
  const pieces = nonEmptyBundleSkus(product);
  if (pieces.length > 0) return pieces.join(", ");
  const sku = product.sku != null ? String(product.sku).trim() : "";
  if (sku) return sku;
  const name = (product.name ?? "").trim();
  return name || null;
}
