"use client";

import { useState } from "react";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import VariantSelector from "@/components/products/VariantSelector";
import { useCartStore } from "@/store/cartStore";
import type { Product, ProductVariant } from "@/types";
import {
  getNationwideFDProductHeading,
  getNationwideFDProductListingLabel,
  isNationwideFDProduct,
} from "@/lib/nfd-product-display";
import {
  getZinatexCardListingLine,
  getZinatexProductDisplayName,
  isZinatexProduct,
} from "@/lib/zinatex-product-display";
import { cn } from "@/lib/utils";

interface ProductVariantPageClientProps {
  product: Product;
  variants: ProductVariant[];
}

export default function ProductVariantPageClient({
  product,
  variants,
}: ProductVariantPageClientProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const addVariantItem = useCartStore((state) => state.addVariantItem);
  const openCart = useCartStore((state) => state.openCart);

  function handleAddToCart(variant: ProductVariant, quantity: number) {
    addVariantItem(product, variant, quantity);
    openCart();
  }

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-[55%_1fr]">
      {/* Image gallery — syncs primary image with selected variant */}
      <ProductImageGallery
        key={selectedVariant?.id ?? "no-variant"}
        rawImages={product.images}
        productName={product.name}
        manufacturer={product.manufacturer}
        onSale={product.on_sale}
        salePrice={product.sale_price}
        primaryImageUrl={
          selectedVariant?.image_url?.startsWith("https://")
            ? selectedVariant.image_url
            : null
        }
      />

      {/* Product info + variant selector */}
      <div>
        {isNationwideFDProduct(product) ? (
          <p className="mb-1 font-sans text-sm font-semibold uppercase tracking-wide text-gray-500">
            {getNationwideFDProductListingLabel(product)}
          </p>
        ) : isZinatexProduct(product) ? (
          <p
            className={cn(
              "mb-1 font-sans text-sm font-semibold tracking-wide text-gray-500",
              "normal-case"
            )}
          >
            {getZinatexCardListingLine(product)}
          </p>
        ) : null}
        <h1 className="font-playfair text-2xl font-semibold leading-tight text-[#1C1C1C] md:text-3xl">
          {isNationwideFDProduct(product)
            ? getNationwideFDProductHeading(product)
            : isZinatexProduct(product)
              ? getZinatexProductDisplayName(product)
              : product.name}
        </h1>

        {product.description && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 font-sans text-xs font-medium uppercase tracking-widest text-[#1C1C1C]/50">
              About This Product
            </p>
            <p className="font-cormorant text-lg leading-relaxed text-[#1C1C1C]/80">
              {product.description}
            </p>
          </div>
        )}

        <VariantSelector
          variants={variants}
          productId={product.id}
          productName={product.name}
          onVariantChange={setSelectedVariant}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}
