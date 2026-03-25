"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Heart, Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface DiscoverReelProps {
  initialProducts: Product[];
  initialNextCursor: number | null;
  seed: number;
}

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

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
        className="reel-outer h-screen w-[100vw] overflow-y-scroll md:w-full md:max-w-[480px] md:mx-auto"
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

          const overlayVisible = visibleCards.has(cardIndex);

          return (
            <section
              key={product.id}
              ref={(el) => {
                cardRefs.current[cardIndex] = el;
              }}
              data-card-index={cardIndex}
              className="relative h-[100dvh] w-full shrink-0 snap-start overflow-hidden bg-black text-white"
            >
              <div
                className="absolute inset-0 z-0 overflow-hidden"
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
                  if (now < clickSuppressedUntilRef.current) return;
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
                        ? "fill-[#ef4444] text-[#ef4444]"
                        : "fill-none text-white"
                    }`}
                  />
                ) : null}
                <div
                  className="reel-inner flex h-full w-full overflow-x-scroll"
                  style={{
                    background: "#111",
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
                        style={{ background: "#111" }}
                      >
                        <Image
                          src={src}
                          alt={product.name}
                          fill
                          style={{ objectFit: "contain" }}
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
              </div>

              {product.images.length > 1 ? (
                <div
                  className="pointer-events-none absolute bottom-4 left-0 right-0 z-[12] flex items-center justify-center gap-1.5"
                  style={{
                    opacity: overlayVisible ? 1 : 0,
                    transition: "opacity 0.3s ease-out",
                  }}
                >
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

              <div
                className="pointer-events-none absolute bottom-20 left-4 right-20 z-[15]"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: "opacity 0.3s ease-out",
                }}
              >
                <div
                  className="pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-2">
                    {product.manufacturer ? (
                      <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                        {product.manufacturer}
                      </span>
                    ) : null}
                    {product.category ? (
                      <span className="inline-flex rounded-full bg-white/60 px-2.5 py-1 text-xs capitalize text-[#1C1C1C]">
                        {product.category.replace("-", " ")}
                      </span>
                    ) : null}
                  </div>

                  <h2
                    className="mt-1 line-clamp-2 text-lg font-bold text-white"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {product.name}
                  </h2>

                  <div
                    className="text-xl font-bold text-white"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {price.regular ? (
                      <>
                        <span>{price.sale}</span>
                        <span className="ml-2 text-base font-bold text-white/70 line-through">
                          {price.regular}
                        </span>
                      </>
                    ) : (
                      <span>{price.sale}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="mt-2 min-w-[140px] w-fit rounded-full bg-[#2D4A3E] px-4 py-2 text-sm font-semibold text-white active:bg-[#1E3329]"
                  >
                    {isAdded ? "Added ✓" : "Add to Cart"}
                  </button>
                </div>
              </div>

              <div
                className="absolute bottom-[100px] right-3 z-[20] flex flex-col items-center gap-[20px]"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: "opacity 0.3s ease-out",
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleWishlist(product.id);
                  }}
                  className="flex flex-col items-center gap-0.5 bg-transparent p-0 text-white"
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart
                    size={28}
                    strokeWidth={isWishlisted ? 0 : 2}
                    className={
                      isWishlisted
                        ? "fill-[#ef4444] text-[#ef4444]"
                        : "fill-none text-white"
                    }
                  />
                  <span className="text-xs text-white/80">Save</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedDescriptionProductId((prev) =>
                      prev === product.id ? null : product.id
                    );
                  }}
                  className="flex flex-col items-center gap-0.5 bg-transparent p-0 text-white"
                  aria-label={
                    isDescriptionOpen ? "Close description" : "Open description"
                  }
                >
                  <MessageCircle size={28} className="text-white" />
                  <span className="text-xs text-white/80">Details</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/products/${product.slug}`);
                  }}
                  className="flex flex-col items-center gap-0.5 bg-transparent p-0 text-white"
                  aria-label="View product page"
                >
                  <ExternalLink size={28} className="text-white" />
                  <span className="text-xs text-white/80">View</span>
                </button>
              </div>

              {isDescriptionOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close description"
                    className="absolute inset-0 z-[25] bg-transparent"
                    onClick={() => setExpandedDescriptionProductId(null)}
                  />
                  <div
                    className="absolute bottom-0 left-0 right-0 z-[26] max-h-[60vh] overflow-y-auto rounded-t-2xl bg-[rgba(0,0,0,0.92)] px-5 pb-12 pt-5 backdrop-blur-[8px]"
                    style={{
                      animation: "reelSheetUp 0.3s ease-out forwards",
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`discover-desc-title-${product.id}`}
                  >
                    <div className="mb-4 flex justify-center">
                      <div className="h-1 w-10 rounded-full bg-white/80" />
                    </div>
                    <p
                      id={`discover-desc-title-${product.id}`}
                      className="mb-1 text-base font-semibold text-white"
                    >
                      {product.name}
                    </p>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {product.manufacturer ? (
                        <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                          {product.manufacturer}
                        </span>
                      ) : null}
                      {product.category ? (
                        <span className="inline-flex rounded-full bg-white/60 px-2.5 py-1 text-xs capitalize text-[#1C1C1C]">
                          {product.category.replace("-", " ")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-3 text-xl font-bold text-white">
                      {price.regular ? (
                        <>
                          <span>{price.sale}</span>
                          <span className="ml-2 text-base font-bold text-white/50 line-through">
                            {price.regular}
                          </span>
                        </>
                      ) : (
                        <span>{price.sale}</span>
                      )}
                    </div>
                    <p className="text-sm leading-[1.6] text-white/80">
                      {product.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedDescriptionProductId(null);
                        router.push(`/products/${product.slug}`);
                      }}
                      className="mt-4 block w-full text-left text-sm font-medium text-[#2D4A3E] hover:underline"
                    >
                      View Full Product →
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          );
        })}

        {isLoading ? (
          <section className="flex h-[100dvh] w-full shrink-0 snap-start items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-[#2D4A3E]" />
          </section>
        ) : null}
      </div>
      <style jsx global>{`
        .reel-outer {
          scrollbar-width: none;
        }
        .reel-outer::-webkit-scrollbar {
          display: none;
        }
        .reel-inner {
          scrollbar-width: none;
        }
        .reel-inner::-webkit-scrollbar {
          display: none;
        }
        @keyframes reelSheetUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
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
