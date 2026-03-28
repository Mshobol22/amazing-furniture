"use client";

import { useState } from "react";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import VariantSelector from "@/components/products/VariantSelector";
import { useCartStore } from "@/store/cartStore";
import type { Product, ProductVariant } from "@/types";
import {
  getNationwideFDProductHeading,
  isNationwideFDProduct,
} from "@/lib/nfd-product-display";

function getCategoryBadgeLabel(category: string): string {
  const labels: Record<string, string> = {
    bed: "BED",
    "bedroom-furniture": "BEDROOM FURNITURE",
    sofa: "SOFA",
    chair: "CHAIR",
    table: "TABLE",
    cabinet: "CABINET",
    "tv-stand": "TV STAND",
    rug: "RUG",
    other: "OTHER",
  };
  return labels[category] ?? category.replace(/-/g, " ").toUpperCase();
}

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
        rawImages={product.images}
        productName={product.name}
        manufacturer={product.manufacturer}
        onSale={product.on_sale}
        salePrice={product.sale_price}
        primaryImageUrl={selectedVariant?.image_url ?? null}
      />

      {/* Product info + variant selector */}
      <div>
        {isNationwideFDProduct(product) ? (
          <div className="mb-1 space-y-1">
            <p className="font-sans text-sm font-semibold uppercase tracking-wide text-gray-500">
              {product.collection?.trim()
                ? product.collection.trim()
                : getCategoryBadgeLabel(product.category)}
            </p>
            <p className="font-sans text-xs font-semibold uppercase tracking-wide text-[#2D4A3E]">
              Nationwide FD
            </p>
          </div>
        ) : null}
        <h1 className="font-playfair text-2xl font-semibold leading-tight text-[#1C1C1C] md:text-3xl">
          {isNationwideFDProduct(product)
            ? getNationwideFDProductHeading(product)
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
