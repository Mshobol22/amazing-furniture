import type { Product } from "@/types";

/** Matches descriptions like `Item Name — rest of text...` */
const ITEM_NAME_SEPARATOR = " \u2014 ";

export function isNationwideFDProduct(
  product: Pick<Product, "manufacturer">
): boolean {
  return product.manufacturer === "Nationwide FD";
}

/**
 * Text before the first ` — ` in the description, or null if absent/empty.
 */
export function extractNfdItemNameFromDescription(
  description: string | null | undefined
): string | null {
  if (!description) return null;
  const idx = description.indexOf(ITEM_NAME_SEPARATOR);
  if (idx <= 0) return null;
  const name = description.slice(0, idx).trim();
  return name.length > 0 ? name : null;
}

/** H1: `CODE — Name` or `CODE` when no extractable name. */
export function getNationwideFDProductHeading(product: Product): string {
  const code = product.name;
  const itemName = extractNfdItemNameFromDescription(product.description);
  if (itemName) return `${code}${ITEM_NAME_SEPARATOR}${itemName}`;
  return code;
}
