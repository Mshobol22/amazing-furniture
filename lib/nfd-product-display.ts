import type { Product } from "@/types";

/** Space + em dash + space, e.g. `B114M — Mirror` */
const TITLE_SEP = " \u2014 ";

export function isNationwideFDProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "Nationwide FD";
}

/**
 * Text before the first em dash (U+2014) in the description, or null if absent/empty.
 */
export function extractNfdItemNameFromDescription(
  description: string | null | undefined
): string | null {
  if (!description) return null;
  const idx = description.indexOf("\u2014");
  if (idx <= 0) return null;
  const name = description.slice(0, idx).trim();
  return name.length > 0 ? name : null;
}

/**
 * NFD H1: `{sku} — {piece_type}` when piece_type is set; else `{sku} — {from description}`
 * before first —; else `{sku}` (product.name is the SKU code).
 */
export function getNationwideFDProductHeading(product: Product): string {
  const sku = product.name;
  const piece = product.piece_type?.trim();
  if (piece) return `${sku}${TITLE_SEP}${piece}`;
  const fromDesc = extractNfdItemNameFromDescription(product.description);
  if (fromDesc) return `${sku}${TITLE_SEP}${fromDesc}`;
  return sku;
}
