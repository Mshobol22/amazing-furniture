"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, MessageCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface DiscoverReelProps {
  initialProducts: Product[];
  initialNextCursor: number | null;
  seed: number;
}

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";
const COLLAPSED_PANEL_HEIGHT_PX = 160;

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getPriceLabel(product: Product) {
  if (product.on_sale && product.sale_price != null) {
    return {
      sale: USD_FORMATTER.format(Number(product.sale_price.toFixed(2))),
      regular: USD_FORMATTER.format(Number(product.price.toFixed(2))),
    };
  }
  return {
    sale: USD_FORMATTER.format(Number(product.price.toFixed(2))),
    regular: null,
  };
}

export default function DiscoverReel({
  initialProducts,
  initialNextCursor,
  seed,
}: DiscoverReelProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const outerScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set([0]));
  const [expandedDescriptionProductId, setExpandedDescriptionProductId] =
    useState<string | null>(null);
  const [imageHeartBurst, setImageHeartBurst] = useState<{
    productId: string;
    isFilled: boolean;
    burstId: number;
  } | null>(null);
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

  // Touch/double-tap handling on the image area.
  const tapTimeoutRef = useRef<number | null>(null);
  const lastTapAtRef = useRef<number>(0);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const clickSuppressedUntilRef = useRef<number>(0);
  const pendingSingleTapSlugRef = useRef<string | null>(null);

  // Heart animation for double-tap wishlist.
  const heartBurstTimeoutRef = useRef<number | null>(null);

  const navigateToProduct = useCallback(
    (slug: string) => {
      router.push(`/products/${slug}`);
    },
    [router]
  );

  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current != null) {
        window.clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      if (heartBurstTimeoutRef.current != null) {
        window.clearTimeout(heartBurstTimeoutRef.current);
        heartBurstTimeoutRef.current = null;
      }
    };
  }, []);

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
    async (productId: string): Promise<boolean> => {
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
          return false;
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
        return true;
      } catch {
        setWishlistedIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(productId);
          else next.delete(productId);
          return next;
        });
        return false;
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
    <div className="fixed inset-0 z-40 bg-black md:bg-[#111] text-white">
      <div className="pointer-events-none fixed right-4 top-4 z-50 text-sm font-light text-white/60">
        Discover
      </div>

      <div
        ref={outerScrollRef}
        className="h-screen w-[100vw] overflow-y-scroll md:w-full md:max-w-[480px] md:mx-auto"
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
          const isDescriptionOpen = expandedDescriptionProductId === product.id;

          return (
            <section
              key={product.id}
              ref={(el) => {
                cardRefs.current[cardIndex] = el;
              }}
              data-card-index={cardIndex}
              className="relative flex h-screen w-full snap-start flex-col overflow-hidden"
            >
              <div
                className="relative min-h-0 flex-1 overflow-hidden"
                onTouchStart={(event) => {
                  if (event.touches.length !== 1) return;
                  const t = event.touches[0];
                  touchStartPointRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchEnd={(event) => {
                  const start = touchStartPointRef.current;
                  touchStartPointRef.current = null;
                  if (!start) return;
                  if (event.changedTouches.length < 1) return;

                  const t = event.changedTouches[0];
                  const dx = t.clientX - start.x;
                  const dy = t.clientY - start.y;
                  const dist = Math.hypot(dx, dy);

                  const now = Date.now();
                  clickSuppressedUntilRef.current = now + 400;

                  // Ignore swipes / scroll gestures.
                  if (dist >= 10) {
                    if (tapTimeoutRef.current != null) {
                      window.clearTimeout(tapTimeoutRef.current);
                      tapTimeoutRef.current = null;
                    }
                    lastTapAtRef.current = 0;
                    pendingSingleTapSlugRef.current = null;
                    return;
                  }

                  const isDoubleTap =
                    lastTapAtRef.current !== 0 && now - lastTapAtRef.current <= 250;

                  if (isDoubleTap) {
                    if (tapTimeoutRef.current != null) {
                      window.clearTimeout(tapTimeoutRef.current);
                      tapTimeoutRef.current = null;
                    }
                    lastTapAtRef.current = 0;
                    pendingSingleTapSlugRef.current = null;

                    const wasWishlisted = wishlistedIds.has(product.id);
                    void (async () => {
                      const didToggle = await toggleWishlist(product.id);
                      if (!didToggle) return;

                      setImageHeartBurst({
                        productId: product.id,
                        isFilled: !wasWishlisted,
                        burstId: Date.now(),
                      });
                      if (heartBurstTimeoutRef.current != null) {
                        window.clearTimeout(heartBurstTimeoutRef.current);
                      }
                      heartBurstTimeoutRef.current = window.setTimeout(
                        () => setImageHeartBurst(null),
                        800
                      );
                    })();
                    return;
                  }

                  lastTapAtRef.current = now;
                  pendingSingleTapSlugRef.current = product.slug;
                  tapTimeoutRef.current = window.setTimeout(() => {
                    tapTimeoutRef.current = null;
                    const slug = pendingSingleTapSlugRef.current;
                    pendingSingleTapSlugRef.current = null;
                    lastTapAtRef.current = 0;
                    if (!slug) return;
                    navigateToProduct(slug);
                  }, 250);
                }}
                onClick={(event) => {
                  const now = Date.now();
                  // Prevent "click" after a touch tap.
                  if (now < clickSuppressedUntilRef.current) return;
                  // Avoid navigating twice on double-click.
                  if (event.detail > 1) return;
                  navigateToProduct(product.slug);
                }}
              >
                {imageHeartBurst?.productId === product.id ? (
                  <Heart
                    key={imageHeartBurst.burstId}
                    size={64}
                    className={`reel-heart-burst pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 ${
                      imageHeartBurst.isFilled
                        ? "text-[#ef4444] fill-[#ef4444]"
                        : "text-white fill-none"
                    }`}
                  />
                ) : null}
                <div
                  className="flex h-full overflow-x-scroll"
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
                      className="relative h-full w-full shrink-0 snap-start"
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

                {product.images.length > 1 ? (
                  <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-1.5">
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

              {/* Tap outside to close the description drawer */}
              {isDescriptionOpen ? (
                <button
                  type="button"
                  onClick={() => setExpandedDescriptionProductId(null)}
                  aria-label="Close description drawer"
                  className="absolute left-0 right-0 top-0 z-[9] bg-transparent"
                  style={{ bottom: COLLAPSED_PANEL_HEIGHT_PX }}
                />
              ) : null}

              {/* Description drawer (slides up from bottom) */}
              <div
                className={`absolute left-0 right-0 z-[10] flex max-h-[50vh] flex-col rounded-t-xl bg-black/90 p-4 backdrop-blur-[12px] backdrop-saturate-[180%] transition-transform duration-300 ease-out ${
                  isDescriptionOpen
                    ? "translate-y-0 pointer-events-auto"
                    : "translate-y-full pointer-events-none"
                }`}
                style={{
                  bottom: COLLAPSED_PANEL_HEIGHT_PX,
                  opacity: visibleCards.has(cardIndex) ? 1 : 0,
                }}
              >
                <div className="mb-3 flex items-center justify-center">
                  <div className="h-1.5 w-11 rounded-full bg-white/80" />
                </div>
                <div className="mb-2 text-sm font-medium text-white/70">Description</div>

                <div className="flex-1 overflow-y-auto pr-2 text-sm leading-relaxed text-white/90">
                  {product.description}
                </div>

                <Link
                  href={`/products/${product.slug}`}
                  className="mt-3 inline-block text-sm font-medium text-[#2D4A3E] transition-colors hover:underline"
                >
                  View Product →
                </Link>
              </div>

              {/* Collapsed panel (always visible) */}
              <div
                className="h-[160px] w-full shrink-0 overflow-hidden border-t border-white/15 bg-black/45 px-6 py-3 backdrop-blur-[12px] backdrop-saturate-[180%]"
                style={{
                  opacity: visibleCards.has(cardIndex) ? 1 : 0,
                  transition: "opacity 0.3s ease-out",
                }}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-2 shrink-0 min-h-0">
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

                  <div className="mt-1 flex items-center justify-between gap-3 shrink-0">
                    <p className="min-w-0 flex-1 truncate text-base font-semibold text-white">
                      {product.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void toggleWishlist(product.id);
                      }}
                      aria-label={
                        isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                      }
                      className="rounded-full p-1"
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          isWishlisted ? "fill-red-500 text-red-500" : "text-white"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-xl font-bold text-white">
                      {price.regular ? (
                        <>
                          <span className="text-white">{price.sale}</span>
                          <span className="ml-2 text-base text-white/50 line-through">
                            {price.regular}
                          </span>
                        </>
                      ) : (
                        <span className="text-white">{price.sale}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDescriptionProductId((prev) =>
                          prev === product.id ? null : product.id
                        )
                      }
                      aria-label={
                        isDescriptionOpen ? "Close description" : "Open description"
                      }
                      className="inline-flex items-center justify-center rounded-full bg-white/10 p-1.5"
                    >
                      {isDescriptionOpen ? (
                        <X className="h-[22px] w-[22px] text-white" />
                      ) : (
                        <MessageCircle className="h-[22px] w-[22px] text-white" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="mt-auto h-[44px] w-full rounded-md bg-[#2D4A3E] px-4 text-center font-semibold text-white transition-colors active:bg-[#1E3329]"
                  >
                    {isAdded ? "Added ✓" : "Add to Cart"}
                  </button>
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
      <style jsx global>{`
        @keyframes reelHeartFade {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
        .reel-heart-burst {
          animation: reelHeartFade 800ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
