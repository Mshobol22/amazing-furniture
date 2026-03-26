"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { useWishlistStore } from "@/store/wishlistStore";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useContextualReelContext } from "@/components/reel/ContextualReelProvider";
import { useReelContext } from "@/components/reel/ReelProvider";
import { getCategoryDisplayName } from "@/lib/collection-utils";

interface ProductCardProps {
  product: Product;
  className?: string;
  collectionCategorySlug?: string;
  collectionManufacturerFilter?: string;
  enableContextualReel?: boolean;
}

export default function ProductCard({
  product,
  className,
  collectionCategorySlug,
  collectionManufacturerFilter,
  enableContextualReel = false,
}: ProductCardProps) {
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const { openReel } = useReelContext();
  const { openContextualReel } = useContextualReelContext();
  const firstImage = product.images[0];
  const safeImage = firstImage?.startsWith("https://") ? firstImage : null;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleReelClick = () => {
    if (!product.collection_group) return;
    void openReel(product.collection_group, product.category);
  };

  return (
    <article
      className={cn(
        "group rounded-lg border border-gray-200 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-t-lg bg-gray-50">
        {product.is_collection_hero ? (
          <span className="absolute left-2 top-2 z-10 rounded bg-[#2D4A3E] px-2 py-0.5 text-xs font-semibold text-white">
            Collection
          </span>
        ) : product.collection_group ? (
          <span className="absolute left-2 top-2 z-10 rounded bg-[#1C1C1C]/70 px-2 py-0.5 text-xs font-medium text-white">
            Part of collection
          </span>
        ) : null}
        {product.on_sale && product.sale_price != null && (
          <span
            className={`absolute left-2 z-10 rounded px-2 py-0.5 text-xs font-semibold text-white ${
              product.collection_group ? "top-8" : "top-2"
            }`}
            style={{ backgroundColor: "#DC2626" }}
          >
            SALE
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlistClick}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/55 p-1.5 shadow-md backdrop-blur-[1px] transition-colors hover:bg-black/70"
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-5 w-5 ${
              isInWishlist
                ? "fill-red-500 text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            }`}
          />
        </button>
        <Link href={`/products/${product.slug}`} className="block">
          <div className="relative aspect-square">
            {safeImage ? (
              <ProductImage
                src={safeImage}
                alt={product.name}
                manufacturer={product.manufacturer}
                fill
                className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="h-full w-full rounded bg-gray-100" aria-hidden="true" />
            )}
          </div>
        </Link>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 font-sans text-sm font-medium text-gray-900 hover:text-[#2D4A3E]"
        >
          {product.name}
        </Link>
        <p className="font-sans text-base font-semibold tabular-nums text-gray-900">
          {product.on_sale && product.sale_price != null ? (
            <>
              <span className="text-base font-semibold text-red-600 tabular-nums">
                ${product.sale_price.toLocaleString()}
              </span>
              <span className="ml-2 text-sm font-normal text-[#1C1C1C]/45 line-through tabular-nums">
                ${product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <>
              ${product.price.toLocaleString()}
              {product.compare_price != null &&
                product.compare_price > product.price && (
                  <span className="ml-2 text-sm font-normal text-[#1C1C1C]/45 line-through tabular-nums">
                    ${product.compare_price.toLocaleString()}
                  </span>
                )}
            </>
          )}
        </p>
        {/* Explore buttons — always visible, side by side */}
        <div className="flex w-full flex-row gap-2">
          {enableContextualReel ? (
            <button
              type="button"
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[#2D4A3E] text-xs font-medium text-white"
              onClick={() => {
                const slug = collectionCategorySlug ?? product.category;
                void openContextualReel({
                  context: "category",
                  contextValue: slug,
                  filterValue: collectionManufacturerFilter,
                  firstProductId: product.id,
                  wordmarkLabel: getCategoryDisplayName(slug),
                });
              }}
            >
              Explore category
            </button>
          ) : null}
          {product.collection_group ? (
            <button
              type="button"
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[#2D4A3E] text-xs font-medium text-white"
              onClick={handleReelClick}
            >
              Explore pieces
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
