import type { Product } from "@/types";

/** Parent-with-`product_variants` or legacy per-SKU rows (numeric design prefix). */
export function shouldFetchZinatexReelVariants(product: Product): boolean {
  if (product.manufacturer !== "Zinatex") return false;
  if (product.has_variants === true) return true;
  const sku = product.sku?.trim();
  if (!sku) return false;
  const designNumber = sku.split("-")[0];
  return Boolean(designNumber && !Number.isNaN(Number(designNumber)));
}

export async function fetchZinatexColorVariantsForReel(
  product: Product
): Promise<Product[]> {
  if (product.manufacturer !== "Zinatex") return [];

  if (product.has_variants === true) {
    const res = await fetch(
      `/api/products/color-variants?parent_id=${encodeURIComponent(product.id)}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { variants?: Product[] };
    return data.variants ?? [];
  }

  const sku = product.sku?.trim();
  if (!sku) return [];
  const designNumber = sku.split("-")[0];
  if (!designNumber || Number.isNaN(Number(designNumber))) return [];

  const res = await fetch(
    `/api/products/color-variants?design_number=${encodeURIComponent(designNumber)}&manufacturer=${encodeURIComponent("Zinatex")}&exclude_id=${encodeURIComponent(product.id)}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { variants?: Product[] };
  return data.variants ?? [];
}
