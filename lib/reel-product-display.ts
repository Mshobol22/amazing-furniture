import type { Product } from "@/types";
import {
  getAcmeProductCardSkuLabel,
  getAcmeProductDetailHeadingFromDescription,
  isAcmeProduct,
} from "@/lib/acme-product-display";
import {
  getNationwideFDProductHeading,
  getNationwideFDProductListingLabel,
  isNationwideFDProduct,
} from "@/lib/nfd-product-display";
import {
  getUnitedFurnitureListingLabel,
  getUnitedFurnitureProductHeading,
  isUnitedFurnitureProduct,
} from "@/lib/united-product-display";
import {
  getZinatexListingLabel,
  isZinatexProduct,
} from "@/lib/zinatex-product-display";

/** Second pill on reel overlay (after manufacturer): Zinatex collection/subcategory, ACME SKU, NFD code/category, else category slug. */
export function getReelOverlaySecondaryLabel(product: Product): string | null {
  if (isZinatexProduct(product)) {
    const label = getZinatexListingLabel(product);
    return label || null;
  }
  if (isAcmeProduct(product)) {
    const s = getAcmeProductCardSkuLabel(product);
    return s || null;
  }
  if (isNationwideFDProduct(product)) {
    return getNationwideFDProductListingLabel(product);
  }
  if (isUnitedFurnitureProduct(product)) {
    return getUnitedFurnitureListingLabel(product);
  }
  const cat = product.category?.trim();
  return cat || null;
}

/** Main reel title line — matches PDP/card rules per manufacturer. */
export function getReelOverlayTitle(product: Product): string {
  if (isZinatexProduct(product)) {
    return product.name;
  }
  if (isAcmeProduct(product)) {
    return getAcmeProductDetailHeadingFromDescription(product.description);
  }
  if (isNationwideFDProduct(product)) {
    return getNationwideFDProductHeading(product);
  }
  if (isUnitedFurnitureProduct(product)) {
    return getUnitedFurnitureProductHeading(product);
  }
  return product.name;
}

export function formatReelSecondaryPillText(value: string): string {
  return value.replace(/-/g, " ");
}
