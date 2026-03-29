import type { Product } from "@/types";

/** Em dash (U+2014) — splits display title vs body in ACME `description` */
const DESC_SEP = "\u2014";

export function isAcmeProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "ACME";
}

export function isAcmeKitProduct(
  product: Pick<Product, "manufacturer" | "acme_product_type">
): boolean {
  return (
    product.manufacturer === "ACME" &&
    String(product.acme_product_type ?? "").trim() === "kit"
  );
}

export function isAcmeComponentProduct(
  product: Pick<Product, "manufacturer" | "acme_product_type">
): boolean {
  return (
    product.manufacturer === "ACME" &&
    String(product.acme_product_type ?? "").trim() === "component"
  );
}

/** ACME PDP finish picker: same `acme_color_group` = color variants of one line. */
export function hasAcmeColorGroup(
  product: Pick<Product, "manufacturer" | "acme_color_group">
): boolean {
  return (
    product.manufacturer === "ACME" &&
    String(product.acme_color_group ?? "").trim() !== ""
  );
}

/**
 * PDP / metadata H1: text before first —, or full description if no separator.
 */
export function getAcmeProductDetailHeadingFromDescription(
  description: string | null | undefined
): string {
  const d = (description ?? "").trim();
  if (!d) return "";
  const idx = d.indexOf(DESC_SEP);
  if (idx < 0) return d;
  const before = d.slice(0, idx).trim();
  return before.length > 0 ? before : d;
}

/**
 * Intro paragraph for About section: text after first —; null if no separator or empty tail.
 */
export function getAcmeDescriptionIntroAfterDash(
  description: string | null | undefined
): string | null {
  const d = (description ?? "").trim();
  const idx = d.indexOf(DESC_SEP);
  if (idx < 0) return null;
  const after = d.slice(idx + DESC_SEP.length).trim();
  return after.length > 0 ? after : null;
}

export type AcmeAboutSpecRow = { label: string; value: string };

/** Finish → Collection → Size → Product Details; only non-empty fields. */
export function getAcmeAboutSpecRows(product: Product): AcmeAboutSpecRow[] {
  const rows: AcmeAboutSpecRow[] = [];
  const push = (label: string, raw: string | null | undefined) => {
    const v = raw != null ? String(raw).trim() : "";
    if (v) rows.push({ label, value: v });
  };
  push("Finish", product.finish);
  push("Collection", product.collection);
  push("Size", product.catalog_size);
  push("Product Details", product.product_details);
  return rows;
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

/** PDP H1 / metadata title: display_name; falls back to item code (`name`) if unset. */
export function getAcmeProductDetailHeading(product: Product): string {
  const dn = getAcmeProductCardDisplayName(product);
  if (dn) return dn;
  return (product.name ?? "").trim();
}
