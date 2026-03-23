"use client";

import { useState } from "react";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import VariantSelector from "@/components/products/VariantSelector";
import { useCartStore } from "@/store/cartStore";
import type { Product, ProductVariant } from "@/types";

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
        onSale={product.on_sale}
        salePrice={product.sale_price}
        primaryImageUrl={selectedVariant?.image_url ?? null}
      />

      {/* Product info + variant selector */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1C1C1C] md:text-3xl">
          {product.name}
        </h1>

        {product.description && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#2D4A3E]">
              About This Product
            </p>
            <p className="text-base font-medium leading-relaxed text-[#1C1C1C]">
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
