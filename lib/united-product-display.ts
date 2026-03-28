import type { Product } from "@/types";

/** Space + em dash + space — matches NFD title separator */
const TITLE_SEP = " \u2014 ";

export function isUnitedFurnitureProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "United Furniture";
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
