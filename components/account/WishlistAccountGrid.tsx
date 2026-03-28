"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { formatPrice } from "@/lib/format-price";
import { Button } from "@/components/ui/button";
import { getEffectivePrice } from "@/store/cartStore";

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

export default function WishlistAccountGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const remove = async (productId: string) => {
    try {
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      if (res.ok) router.refresh();
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const safeImage = productLeadImageSrc(product.manufacturer, product.images?.[0]);
        const inStock = product.in_stock !== false;
        return (
          <article
            key={product.id}
            className="overflow-hidden rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm"
          >
            <div className="relative">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative aspect-square bg-[#FAF8F5]">
                  {safeImage ? (
                    <Image
                      src={safeImage}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
              <button
                type="button"
                onClick={() => void remove(product.id)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-500 shadow-md ring-1 ring-black/5 transition hover:bg-white"
                aria-label="Remove from wishlist"
              >
                <Heart className="h-5 w-5 fill-current" />
              </button>
            </div>
            <div className="space-y-2 p-3">
              <p className="font-sans text-xs font-semibold uppercase tracking-wide text-gray-500">
                {getCategoryBadgeLabel(product.category)}
              </p>
              <Link
                href={`/products/${product.slug}`}
                className="line-clamp-2 block font-sans text-sm font-medium text-[#1C1C1C] hover:text-[#2D4A3E]"
              >
                {product.name}
              </Link>
              <p className="font-sans text-base font-semibold tabular-nums text-[#1C1C1C]">
                {product.on_sale && product.sale_price != null ? (
                  <>
                    <span className="text-red-600">{formatPrice(product.sale_price)}</span>
                    <span className="ml-2 text-sm font-normal text-[#1C1C1C]/45 line-through">
                      {formatPrice(product.price)}
                    </span>
                  </>
                ) : (
                  formatPrice(getEffectivePrice(product))
                )}
              </p>
              {!inStock ? (
                <Button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed bg-gray-300 text-gray-600 hover:bg-gray-300"
                >
                  Out of Stock
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => addItem(product, 1)}
                  className="w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
                >
                  Add to Cart
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
