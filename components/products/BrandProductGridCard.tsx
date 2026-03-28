"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { useContextualReelContext } from "@/components/reel/ContextualReelProvider";
import { useReelContext } from "@/components/reel/ReelProvider";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import {
  getAcmeProductCardDisplayName,
  getAcmeProductCardSkuLabel,
  isAcmeProduct,
} from "@/lib/acme-product-display";
import {
  getNationwideFDProductHeading,
  getNationwideFDProductListingLabel,
  isNationwideFDProduct,
} from "@/lib/nfd-product-display";
import {
  getUnitedFurnitureListingLabel,
  getUnitedFurnitureProductHeading,
  isUnitedFurnitureProduct,
} from "@/lib/united-product-display";
import {
  getZinatexCardListingLine,
  getZinatexProductDisplayName,
  isZinatexProduct,
} from "@/lib/zinatex-product-display";

interface BrandProductGridCardProps {
  product: Product;
  brandName?: string;
  categoryFilter?: string;
}

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

export default function BrandProductGridCard({
  product,
  brandName,
  categoryFilter,
}: BrandProductGridCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { openReel } = useReelContext();
  const { openContextualReel } = useContextualReelContext();
  const safeImage = productLeadImageSrc(product.manufacturer, product.images?.[0]);

  return (
    <article className="overflow-hidden rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square bg-[#FAF8F5]">
          {product.is_collection_hero ? (
            <span className="absolute left-2 top-2 z-10 rounded bg-[#2D4A3E] px-2 py-1 text-xs font-semibold text-white">
              Collection
            </span>
          ) : product.collection_group ? (
            <span className="absolute left-2 top-2 z-10 rounded bg-[#1C1C1C]/70 px-2 py-1 text-xs font-medium text-white">
              Part of collection
            </span>
          ) : null}
          {safeImage ? (
            <Image
              src={safeImage}
              alt={product.name}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full" />
          )}
          {product.in_stock === false && (
            <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/50">
              <span className="rounded bg-black/60 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                OUT OF STOCK
              </span>
            </div>
          )}
          {product.on_sale && (
            <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
              SALE
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-2 p-3">
        <p
          className={cn(
            "font-sans text-xs font-semibold tracking-wide text-gray-500",
            isZinatexProduct(product) ? "normal-case" : "uppercase"
          )}
        >
          {isNationwideFDProduct(product)
            ? getNationwideFDProductListingLabel(product)
            : isAcmeProduct(product)
              ? getAcmeProductCardSkuLabel(product)
              : isUnitedFurnitureProduct(product)
                ? getUnitedFurnitureListingLabel(product)
                : isZinatexProduct(product)
                  ? getZinatexCardListingLine(product)
                  : getCategoryBadgeLabel(product.category)}
        </p>
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 font-sans text-sm font-medium text-[#1C1C1C] hover:text-[#2D4A3E]"
        >
          {isNationwideFDProduct(product)
            ? getNationwideFDProductHeading(product)
            : isAcmeProduct(product)
              ? getAcmeProductCardDisplayName(product)
              : isUnitedFurnitureProduct(product)
                ? getUnitedFurnitureProductHeading(product)
                : isZinatexProduct(product)
                  ? getZinatexProductDisplayName(product)
                  : product.name}
        </Link>
        <p className="font-sans text-base font-semibold tabular-nums text-[#1C1C1C]">
          {product.on_sale && product.sale_price ? (
            <>
              <span className="text-base font-semibold text-red-600 tabular-nums">
                {formatPrice(product.sale_price)}
              </span>
              <span className="ml-2 text-sm font-normal text-[#1C1C1C]/45 line-through tabular-nums">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <>{formatPrice(product.price)}</>
          )}
        </p>
        {/* Explore buttons — always visible, side by side */}
        <div className="flex w-full flex-row gap-2">
          {brandName ? (
            <button
              type="button"
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[#2D4A3E] text-xs font-medium text-white"
              onClick={() =>
                void openContextualReel({
                  context: "brand",
                  contextValue: brandName,
                  filterValue: categoryFilter,
                  firstProductId: product.id,
                  wordmarkLabel: brandName,
                })
              }
            >
              Explore brand
            </button>
          ) : null}
          {product.collection_group ? (
            <button
              type="button"
              className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-[#2D4A3E] text-xs font-medium text-white"
              onClick={() => {
                if (!product.collection_group) return;
                void openReel(product.collection_group, product.category);
              }}
            >
              Explore pieces
            </button>
          ) : null}
        </div>
        {product.in_stock === false ? (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg bg-gray-300 px-3 py-2 text-sm font-medium text-gray-600"
          >
            Out of Stock
          </button>
        ) : (
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className="w-full rounded-lg bg-[#2D4A3E] px-3 py-2 text-sm font-medium text-[#FAF8F5] hover:bg-[#1E3329]"
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  );
}
