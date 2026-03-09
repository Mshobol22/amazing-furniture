"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-lg bg-light-sand">
        <div className="aspect-square">
          <Image
            src={product.images[0] ?? ""}
            alt={product.name}
            width={600}
            height={600}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div
          className={cn(
            "absolute bottom-4 left-4 right-4 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button
            onClick={handleAddToCart}
            className="w-full bg-walnut text-cream hover:bg-walnut/90"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-display text-lg font-medium text-charcoal">
          {product.name}
        </h3>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-warm-gray">
            ${product.price.toLocaleString()}
          </span>
          {product.compare_price != null && product.compare_price > product.price && (
            <span className="text-sm text-warm-gray line-through">
              ${product.compare_price.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
