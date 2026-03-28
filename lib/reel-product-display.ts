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

/** Second pill on reel overlay (after manufacturer): Zinatex collection, ACME SKU, NFD code/category, else category slug. */
export function getReelOverlaySecondaryLabel(product: Product): string | null {
  if (product.manufacturer === "Zinatex") {
    const c = product.collection?.trim();
    return c || null;
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

/** Main reel title line — matches PDP/card rules for ACME and Nationwide FD. */
export function getReelOverlayTitle(product: Product): string {
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
