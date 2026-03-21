"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2D4A3E] mb-2">
            About This Product
          </p>
          <p className="text-[#1C1C1C] font-medium text-base leading-relaxed">
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
        <Button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          className="w-fit bg-[#1C1C1C] text-white hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
          Add to Cart
        </Button>
      </div>

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
        <Button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          className="flex-1 bg-[#1C1C1C] text-white hover:bg-[#2a2a2a] disabled:opacity-50"
        >
          <ShoppingCart className="mr-2 h-4 w-4 text-[#2D4A3E]" />
          {product.in_stock ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
    </>
  );
}
