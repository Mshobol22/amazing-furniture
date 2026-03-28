"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import { isUnitedFurnitureProduct } from "@/lib/united-product-display";
import type { Product } from "@/types";

interface ProductDetailClientProps {
  product: Product;
}

export default function ProductDetailClient({
  product,
}: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!product.in_stock) return;
    addItem(product, quantity);
  };

  return (
    <>
      {/* Description — always visible */}
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

      {/* Quantity + Add to Cart — desktop */}
      <div className="mt-6 hidden sm:flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="quantity" className="text-sm font-medium text-charcoal">
            Quantity:
          </label>
          <select
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="rounded-md border border-warm-gray/30 bg-cream px-3 py-2 text-charcoal"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {product.in_stock ? (
          <Button
            onClick={handleAddToCart}
            className="w-fit bg-[#1C1C1C] font-sans font-semibold tracking-wide text-white hover:bg-[#2a2a2a]"
          >
            <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
            Add to Cart
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="w-fit cursor-not-allowed bg-gray-300 font-sans font-semibold tracking-wide text-gray-600 hover:bg-gray-300"
          >
            Out of Stock
          </Button>
        )}
      </div>

      {isUnitedFurnitureProduct(product) &&
      product.page_features &&
      product.page_features.length > 0 ? (
        <section
          className="mt-6 border-t border-gray-100 pt-6 sm:mt-8"
          aria-labelledby="uf-product-features-heading"
        >
          <h3
            id="uf-product-features-heading"
            className="mb-3 font-cormorant text-lg font-semibold text-[#1C1C1C] md:text-xl"
          >
            Product Features
          </h3>
          <ul className="space-y-2.5">
            {product.page_features.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`} className="flex gap-2.5">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#2D4A3E]"
                  aria-hidden
                />
                <span className="font-sans text-sm leading-relaxed text-[#1C1C1C]/80">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Sticky CTA — mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:hidden">
        <select
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm text-charcoal"
          aria-label="Quantity"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        {product.in_stock ? (
          <Button
            onClick={handleAddToCart}
            className="flex-1 bg-[#1C1C1C] font-sans font-semibold tracking-wide text-white hover:bg-[#2a2a2a]"
          >
            <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
            Add to Cart
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="flex-1 cursor-not-allowed bg-gray-300 font-sans font-semibold tracking-wide text-gray-600 hover:bg-gray-300"
          >
            Out of Stock
          </Button>
        )}
      </div>
    </>
  );
}
