"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";

export default function BrandProductGridCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const safeImage = productLeadImageSrc(product.manufacturer, product.images?.[0]);

  return (
    <article className="overflow-hidden rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-[#FAF8F5]">
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
      <div className="space-y-2 p-3">
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
