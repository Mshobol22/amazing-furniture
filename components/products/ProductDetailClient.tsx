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
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
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
  );
}
