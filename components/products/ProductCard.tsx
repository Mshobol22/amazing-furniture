"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { cn, extractSku } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const sku = extractSku(product.slug);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group block rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-t-lg bg-gray-50">
        <div className="relative aspect-[4/3] p-2 md:p-3">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {sku && (
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {sku}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
          {product.name}
        </h3>
        <p className="text-lg font-semibold text-gray-900">
          {product.on_sale && product.sale_price != null ? (
            <>
              <span className="text-red-600">
                ${product.sale_price.toLocaleString()}
              </span>
              <span className="ml-2 text-sm font-normal text-gray-500 line-through">
                ${product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <>
              ${product.price.toLocaleString()}
              {product.compare_price != null &&
                product.compare_price > product.price && (
                  <span className="ml-2 text-sm font-normal text-gray-500 line-through">
                    ${product.compare_price.toLocaleString()}
                  </span>
                )}
            </>
          )}
        </p>
        <Button
          onClick={handleAddToCart}
          className="mt-2 w-full bg-gray-900 text-white hover:bg-gray-800"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </Link>
  );
}
