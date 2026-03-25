"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { ReelTrigger } from "@/components/reel/ProductReel";
import { useContextualReelContext } from "@/components/reel/ContextualReelProvider";
import { useReelContext } from "@/components/reel/ReelProvider";

interface BrandProductGridCardProps {
  product: Product;
  brandName?: string;
  categoryFilter?: string;
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
        <div className="relative aspect-[4/3] bg-[#FAF8F5]">
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
              className="object-contain p-3"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="h-full w-full" />
          )}
          {product.on_sale && (
            <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
              SALE
            </span>
          )}
        </div>
      </Link>
      {brandName ? (
        <div className="flex justify-center px-3 pt-2">
          <ReelTrigger
            variant="compact"
            label="Explore brand"
            onClick={() =>
              void openContextualReel({
                context: "brand",
                contextValue: brandName,
                filterValue: categoryFilter,
                firstProductId: product.id,
                wordmarkLabel: brandName,
              })
            }
          />
        </div>
      ) : null}
      <div className="space-y-2 p-3">
        {product.collection_group ? (
          <div>
            <ReelTrigger
              variant="compact"
              label="Explore pieces"
              onClick={() => {
                if (!product.collection_group) return;
                void openReel(product.collection_group, product.category);
              }}
            />
          </div>
        ) : null}
        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 font-sans text-sm font-medium text-[#1C1C1C] hover:text-[#2D4A3E]"
        >
          {product.name}
        </Link>
        <p className="font-sans text-base font-semibold tabular-nums text-[#1C1C1C]">
          {product.on_sale && product.sale_price ? (
            <>
              <span className="text-base font-semibold text-red-600 tabular-nums">
                ${product.sale_price.toLocaleString()}
              </span>
              <span className="ml-2 text-sm font-normal text-[#1C1C1C]/45 line-through tabular-nums">
                ${product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <>${product.price.toLocaleString()}</>
          )}
        </p>
        <button
          type="button"
          onClick={() => addItem(product, 1)}
          className="w-full rounded-lg bg-[#2D4A3E] px-3 py-2 text-sm font-medium text-[#FAF8F5] hover:bg-[#1E3329]"
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}
