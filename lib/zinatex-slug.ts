/**
 * Zinatex product URL slug rules.
 * Parent PDP URL must never include full variation SKU (color/size segments).
 * Must stay in sync with scripts/import-zinatex.mjs slug rules.
 */

/** Same rules as import script `safeSku` — full variation SKU normalized for slug suffix. */
export function normalizeZinatexVariationSkuForSlug(sku: string): string {
  return sku
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Extract the segment after `-ztx-` in a product slug (legacy per-variant URLs). */
export function extractZinatexSlugSuffix(slug: string): string | null {
  const marker = "-ztx-";
  const idx = slug.indexOf(marker);
  if (idx === -1) return null;
  return slug.slice(idx + marker.length);
}

/**
 * Style / parent key from Variation SKU: leading numeric run (e.g. 99903-Beige-10x13 → 99903).
 * If the first segment is not all digits, the whole SKU is normalized (non-standard SKUs).
 */
export function zinatexStyleKeyFromVariationSku(sku: string): string {
  const trimmed = sku.trim();
  if (!trimmed) return "";
  const first = trimmed.split("-")[0] ?? "";
  if (/^\d+$/.test(first)) return first.toLowerCase();
  return normalizeZinatexVariationSkuForSlug(trimmed);
}

export function zinatexSlugBaseFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Canonical parent slug: title base + `-ztx-` + style key (not full variation SKU). */
export function canonicalZinatexProductSlug(title: string, variationSku: string): string {
  const base = zinatexSlugBaseFromTitle(title);
  const styleKey = zinatexStyleKeyFromVariationSku(variationSku);
  const safeStyle = styleKey
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-ztx-${safeStyle}`;
}
