"use client";

import Link from "next/link";
import { ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ui/ProductImage";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const firstImage = product.images[0];
  const safeImage = firstImage?.startsWith("https://") ? firstImage : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product, 1);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group block rounded-lg border border-gray-200 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-t-lg bg-gray-50">
        {product.on_sale && product.sale_price != null && (
          <span
            className="absolute left-2 top-2 z-10 rounded px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: "#DC2626" }}
          >
            SALE
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlistClick}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white"
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-5 w-5 ${
              isInWishlist ? "fill-red-500 text-red-500" : "text-gray-600"
            }`}
          />
        </button>
        <div className="relative aspect-[4/3] p-2 md:p-3">
          {safeImage ? (
            <ProductImage
              src={safeImage}
              alt={product.name}
              manufacturer={product.manufacturer}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="h-full w-full rounded bg-gray-100" aria-hidden="true" />
          )}
        </div>
        {/* Hover overlay CTA */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-200 group-hover:translate-y-0">
          <Button
            onClick={handleAddToCart}
            className="w-full rounded-none bg-gray-900 text-white hover:bg-gray-800 py-2.5 text-sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
          {product.name}
        </h3>
        <p className="text-base font-semibold text-gray-900">
          {product.on_sale && product.sale_price != null ? (
            <>
              <span style={{ color: "#DC2626" }}>
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
      </div>
    </Link>
  );
}
