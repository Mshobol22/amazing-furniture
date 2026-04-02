"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/store/cartStore";
import type { WishlistAccountEntry } from "@/types/wishlist-account";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { formatPrice } from "@/lib/format-price";
import { Button } from "@/components/ui/button";
import { getEffectivePrice } from "@/store/cartStore";
import { ProductCardImage } from "@/components/ui/ProductCardImage";

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

export default function AccountWishlistView({
  initialEntries,
}: {
  initialEntries: WishlistAccountEntry[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [entries, setEntries] = useState<WishlistAccountEntry[]>(initialEntries);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const remove = async (wishlistId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error: delErr } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", wishlistId)
      .eq("user_id", user.id);
    if (!delErr) {
      setEntries((prev) => prev.filter((e) => e.wishlistId !== wishlistId));
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-10 text-center shadow-sm">
        <h1 className="font-sans text-xl font-semibold text-charcoal">Wishlist</h1>
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#2D4A3E]/10 text-2xl text-[#2D4A3E]">
          <Heart className="h-8 w-8" />
        </div>
        <p className="mt-3 text-warm-gray">Your wishlist is empty — save items you love</p>
        <Link
          href="/collections/all"
          className="mt-6 inline-flex rounded-lg bg-[#2D4A3E] px-5 py-2.5 text-sm font-medium text-cream hover:bg-[#1E3329]"
        >
          Browse collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Wishlist</h1>
        <p className="mt-1 text-sm text-warm-gray">{entries.length} saved items</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ wishlistId, product }) => {
          const safeImage = productLeadImageSrc(product.manufacturer, product.images?.[0]);
          const inStock = product.in_stock !== false;
          return (
            <article
              key={wishlistId}
              className="group overflow-hidden rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm"
            >
              <div className="relative">
                <Link href={`/products/${product.slug}`} className="block">
                  <div className="relative aspect-square bg-[#FAF8F5]">
                    <ProductCardImage
                      src={safeImage}
                      alt={product.name}
                      manufacturer={product.manufacturer}
                      imageClassName="object-contain p-2"
                      cardClassName="bg-[#FAF8F5]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {product.on_sale && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        SALE
                      </span>
                    )}
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                      {inStock ? (
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            addItem(product, 1);
                          }}
                          className="w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
                        >
                          Add to Cart
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          disabled
                          className="w-full cursor-not-allowed bg-gray-300 text-gray-600 hover:bg-gray-300"
                        >
                          Out of Stock
                        </Button>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void remove(wishlistId)}
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
                <Button
                  type="button"
                  onClick={() => addItem(product, 1)}
                  disabled={!inStock}
                  className="w-full bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                >
                  {inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
