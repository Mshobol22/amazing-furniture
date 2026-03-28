import type { Product } from "@/types";

export function isAcmeProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "ACME";
}

/** Card label line: item number (same role as SKU on the product page). */
export function getAcmeProductCardSkuLabel(product: Product): string {
  const sku = product.sku != null ? String(product.sku).trim() : "";
  if (sku) return sku;
  return (product.name ?? "").trim();
}

/** Card title line: human-readable name from DB (populated for ACME catalog). */
export function getAcmeProductCardDisplayName(product: Product): string {
  return product.display_name != null ? String(product.display_name).trim() : "";
}
