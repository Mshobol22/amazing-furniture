"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface DiscoverReelProps {
  initialProducts: Product[];
  initialNextCursor: number | null;
  seed: number;
}

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

function getPriceLabel(product: Product) {
  if (product.on_sale && product.sale_price != null) {
    return {
      sale: `$${product.sale_price.toLocaleString()}`,
      regular: `$${product.price.toLocaleString()}`,
    };
  }
  return {
    sale: `$${product.price.toLocaleString()}`,
    regular: null,
  };
}

export default function DiscoverReel({
  initialProducts,
  initialNextCursor,
  seed,
}: DiscoverReelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const outerScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set([0]));
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [imageErrorMap, setImageErrorMap] = useState<Map<string, Set<number>>>(
    new Map()
  );
  const [isAddingToCart, setIsAddingToCart] = useState<Map<string, boolean>>(
    new Map()
  );
  const [activeImageIndexMap, setActiveImageIndexMap] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    setProducts(initialProducts);
    setNextCursor(initialNextCursor);
  }, [initialProducts, initialNextCursor]);

  const fetchWishlistStatus = useCallback(async (productIds: string[]) => {
    if (productIds.length === 0) return;
    try {
      const response = await fetch(
        `/api/wishlist/status?product_ids=${encodeURIComponent(productIds.join(","))}`
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { wishlisted?: string[] };
      const ids = Array.isArray(payload.wishlisted) ? payload.wishlisted : [];
      setWishlistedIds((prev) => new Set([...Array.from(prev), ...ids]));
    } catch {
      // No-op: wishlist status is best-effort in discover mode
    }
  }, []);

  useEffect(() => {
    fetchWishlistStatus(initialProducts.map((p) => p.id));
  }, [fetchWishlistStatus, initialProducts]);

  const loadMore = useCallback(async () => {
    if (nextCursor == null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/discover?limit=20&cursor=${nextCursor}&seed=${seed}`
      );
      if (!response.ok) return;
      const payload = (await response.json()) as {
        products: Product[];
        nextCursor: number | null;
      };

      const newProducts = payload.products ?? [];
      if (newProducts.length > 0) {
        setProducts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const item of newProducts) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
        fetchWishlistStatus(newProducts.map((p) => p.id));
      }
      setNextCursor(payload.nextCursor ?? null);
    } catch {
      // No-op: keep current list when discover pagination fails
    } finally {
      setIsLoading(false);
      loadingMoreRef.current = false;
    }
  }, [fetchWishlistStatus, nextCursor, seed]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleCards((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const index = Number(entry.target.getAttribute("data-card-index"));
            if (entry.isIntersecting) {
              next.add(index);
              if (entry.intersectionRatio > 0.65) {
                setActiveCardIndex(index);
              }
              if (index >= products.length - 3 && nextCursor != null) {
                void loadMore();
              }
            }
          });
          return next;
        });
      },
      { threshold: [0.45, 0.7] }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, [loadMore, nextCursor, products.length]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const had = wishlistedIds.has(productId);
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        if (had) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        const response = await fetch("/api/wishlist/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });

        if (response.status === 401) {
          setWishlistedIds((prev) => {
            const next = new Set(prev);
            if (had) next.add(productId);
            else next.delete(productId);
            return next;
          });
          toast({ title: "Sign in to save items" });
          return;
        }

        if (!response.ok) {
          throw new Error("Wishlist toggle failed");
        }

        const data = (await response.json()) as { wishlisted: boolean };
        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (data.wishlisted) next.add(productId);
          else next.delete(productId);
          return next;
        });
      } catch {
        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(productId);
          else next.delete(productId);
          return next;
        });
      }
    },
    [wishlistedIds]
  );

  const handleImageError = useCallback((productId: string, imageIndex: number) => {
    setImageErrorMap((prev) => {
      const next = new Map(prev);
      const errors = new Set(next.get(productId) ?? []);
      errors.add(imageIndex);
      next.set(productId, errors);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (product: Product) => {
      addItem(product, 1);
      setIsAddingToCart((prev) => {
        const next = new Map(prev);
        next.set(product.id, true);
        return next;
      });
      window.setTimeout(() => {
        setIsAddingToCart((prev) => {
          const next = new Map(prev);
          next.set(product.id, false);
          return next;
        });
      }, 1500);
    },
    [addItem]
  );

  const hiddenCardIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const product of products) {
      const imageCount = product.images?.length ?? 0;
      const failedCount = imageErrorMap.get(product.id)?.size ?? 0;
      if (imageCount > 0 && failedCount >= imageCount) {
        hidden.add(product.id);
      }
    }
    return hidden;
  }, [products, imageErrorMap]);

  const heroImageByGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) {
      if (!product.collection_group || !product.is_collection_hero) continue;
      const lead = product.images?.[0];
      if (typeof lead === "string" && lead.length > 0) {
        map.set(product.collection_group, lead);
      }
    }
    return map;
  }, [products]);

  return (
    <div className="fixed inset-0 z-40 bg-black text-white">
      <div className="pointer-events-none fixed right-4 top-4 z-50 text-sm font-light text-white/60">
        Discover
      </div>

      <div
        ref={outerScrollRef}
        className="h-screen overflow-y-scroll"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        {products.map((product, cardIndex) => {
          if (hiddenCardIds.has(product.id)) {
            return (
              <section
                key={product.id}
                ref={(el) => {
                  cardRefs.current[cardIndex] = el;
                }}
                data-card-index={cardIndex}
                className="hidden"
              />
            );
          }

          const price = getPriceLabel(product);
          const activeImageIndex = activeImageIndexMap.get(product.id) ?? 0;
          const isCollectionHero = Boolean(product.is_collection_hero);
          const groupHeroImage = product.collection_group
            ? heroImageByGroup.get(product.collection_group)
            : null;
          const usesSharedCollectionImage =
            !isCollectionHero &&
            Boolean(groupHeroImage) &&
            product.images[0] === groupHeroImage;
          const isWishlisted = wishlistedIds.has(product.id);
          const isAdded = Boolean(isAddingToCart.get(product.id));

          return (
            <section
              key={product.id}
              ref={(el) => {
                cardRefs.current[cardIndex] = el;
              }}
              data-card-index={cardIndex}
              className="relative h-screen w-full snap-start overflow-hidden"
            >
              <div
                className="absolute inset-0 flex overflow-x-scroll"
                style={{
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                  touchAction: "pan-x",
                }}
                onScroll={(event) => {
                  const target = event.currentTarget;
                  const nextIndex = Math.round(target.scrollLeft / target.clientWidth);
                  setActiveImageIndexMap((prev) => {
                    const next = new Map(prev);
                    next.set(product.id, nextIndex);
                    return next;
                  });
                }}
              >
                {product.images.map((imageSrc, imageIndex) => {
                  const failedForCard = imageErrorMap.get(product.id)?.has(imageIndex);
                  const src = failedForCard ? PLACEHOLDER_IMAGE : imageSrc;
                  const priority = cardIndex === 0 && imageIndex === 0;

                  return (
                    <div
                      key={`${product.id}-${imageIndex}`}
                      className="relative h-screen w-screen shrink-0 snap-start"
                    >
                      <Image
                        src={src}
                        alt={product.name}
                        fill
                        className="object-cover"
                        priority={priority}
                        loading={priority ? undefined : "lazy"}
                        onError={() => handleImageError(product.id, imageIndex)}
                      />
                      {usesSharedCollectionImage && imageIndex === 0 ? (
                        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                          Collection View
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-hidden border-t border-white/15 bg-black/45 px-6 pb-14 pt-5 backdrop-blur-[12px] backdrop-saturate-[180%]"
                style={{
                  transform: visibleCards.has(cardIndex)
                    ? "translateY(0)"
                    : "translateY(100%)",
                  transition: "transform 0.35s ease-out",
                }}
              >
                <div className="max-h-full overflow-y-auto">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {product.manufacturer ? (
                      <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                        {product.manufacturer}
                      </span>
                    ) : null}
                    {product.category ? (
                      <span className="inline-flex rounded-full bg-white/60 px-2.5 py-1 text-xs text-[#1C1C1C] capitalize">
                        {product.category.replace("-", " ")}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-white">
                    {product.name}
                  </h3>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-xl font-bold">
                      {price.regular ? (
                        <>
                          <span className="text-[#2D4A3E]">{price.sale}</span>
                          <span className="ml-2 text-base text-gray-300 line-through">
                            {price.regular}
                          </span>
                        </>
                      ) : (
                        <span className="text-white">{price.sale}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(product.id)}
                      aria-label={
                        isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                      }
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          isWishlisted ? "fill-red-500 text-red-500" : "text-white"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-white/80">
                    {product.description}
                  </p>

                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-1 inline-block text-xs font-medium text-[#2D4A3E] transition-colors hover:underline"
                  >
                    View Product →
                  </Link>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="mt-3 w-full rounded-md bg-[#2D4A3E] px-4 py-3 text-center font-semibold text-white transition-colors active:bg-[#1E3329]"
                  >
                    {isAdded ? "Added ✓" : "Add to Cart"}
                  </button>

                  {product.images.length > 1 ? (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      {product.images.map((_, dotIndex) => (
                        <span
                          key={`${product.id}-dot-${dotIndex}`}
                          className={`h-1.5 w-1.5 rounded-full ${
                            activeImageIndex === dotIndex ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}

        {isLoading ? (
          <section className="flex h-screen w-full snap-start items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-[#2D4A3E]" />
          </section>
        ) : null}
      </div>
    </div>
  );
}
