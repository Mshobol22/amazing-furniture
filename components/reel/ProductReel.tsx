"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, Loader2, MessageCircle, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/types";

type ReelCard = Product | { type: "divider"; id: "divider-card" };

interface ProductReelProps {
  isOpen: boolean;
  onClose: () => void;
  collectionPieces: Product[];
  relatedProducts: Product[];
  category?: string;
  heroImageUrl?: string;
  initialWishlisted?: string[];
  onLoadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
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

export default function ProductReel({
  isOpen,
  onClose,
  collectionPieces,
  relatedProducts,
  category,
  heroImageUrl,
  initialWishlisted = [],
  onLoadMore,
  isLoadingMore = false,
}: ProductReelProps) {
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
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(
    new Set(initialWishlisted)
  );
  const [imageErrorMap, setImageErrorMap] = useState<Map<string, Set<number>>>(
    new Map()
  );
  const [isAddingToCart, setIsAddingToCart] = useState<Map<string, boolean>>(
    new Map()
  );
  const [activeImageIndexMap, setActiveImageIndexMap] = useState<Map<string, number>>(
    new Map()
  );
  const [cards, setCards] = useState<ReelCard[]>([]);
  const normalizedCategory = (category ?? "").trim();

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
      onClose();
      router.push(`/products/${slug}`);
    },
    [onClose, router]
  );

  useEffect(() => {
    setWishlistedIds(new Set(initialWishlisted));
  }, [initialWishlisted]);

  useEffect(() => {
    const nextCards: ReelCard[] = [...collectionPieces];
    if (collectionPieces.length > 0 && relatedProducts.length > 0) {
      nextCards.push({ type: "divider", id: "divider-card" });
    }
    nextCards.push(...relatedProducts);
    setCards(nextCards);
  }, [collectionPieces, relatedProducts]);

  useEffect(() => {
    loadingMoreRef.current = false;
  }, [relatedProducts.length, isLoadingMore]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setExpandedDescriptionProductId(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (tapTimeoutRef.current != null) {
        window.clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      lastTapAtRef.current = 0;
      pendingSingleTapSlugRef.current = null;
      if (heartBurstTimeoutRef.current != null) {
        window.clearTimeout(heartBurstTimeoutRef.current);
        heartBurstTimeoutRef.current = null;
      }
      setImageHeartBurst(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleCards((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            const index = Number(entry.target.getAttribute("data-card-index"));
            if (entry.isIntersecting) {
              next.add(index);
              // One-time reveal per card: stop observing once first seen.
              observer.unobserve(entry.target);
              if (entry.intersectionRatio > 0.65) {
                setActiveCardIndex(index);
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
  }, [isOpen, cards.length]);

  useEffect(() => {
    if (!isOpen || !onLoadMore || cards.length === 0) return;

    const lastCard = cardRefs.current[cards.length - 1];
    if (!lastCard) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || loadingMoreRef.current || isLoadingMore) {
            continue;
          }
          loadingMoreRef.current = true;
          try {
            await onLoadMore();
          } finally {
            if (!isLoadingMore) {
              loadingMoreRef.current = false;
            }
          }
        }
      },
      { threshold: 0.8 }
    );

    observer.observe(lastCard);
    return () => observer.disconnect();
  }, [cards.length, isLoadingMore, isOpen, onLoadMore]);

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

  const handleProductNavigation = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
      event.preventDefault();
      onClose();
      router.push(`/products/${slug}`);
    },
    [onClose, router]
  );

  const hiddenCardIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const product of cards) {
      if ("type" in product) continue;
      const imageCount = product.images?.length ?? 0;
      const failedCount = imageErrorMap.get(product.id)?.size ?? 0;
      if (imageCount > 0 && failedCount >= imageCount) {
        hidden.add(product.id);
      }
    }
    return hidden;
  }, [cards, imageErrorMap]);

  const nonHeroCollectionPieces = useMemo(
    () => collectionPieces.filter((p) => !p.is_collection_hero),
    [collectionPieces]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black md:bg-[#111] text-white">
      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-4 z-[60] rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
        aria-label="Close reel"
      >
        <X className="h-6 w-6" />
      </button>

      <div
        ref={outerScrollRef}
        className="reel-outer h-screen w-[100vw] overflow-y-scroll md:w-full md:max-w-[480px] md:mx-auto"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        {cards.map((card, cardIndex) => {
          if ("type" in card) {
            return (
              <section
                key={card.id}
                ref={(el) => {
                  cardRefs.current[cardIndex] = el;
                }}
                data-card-index={cardIndex}
                className="relative flex h-screen w-full snap-start items-center justify-center overflow-hidden bg-gradient-to-b from-[#2D4A3E] to-[#1C1C1C]"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-2xl font-light text-white">
                    {normalizedCategory
                      ? `More ${normalizedCategory} for you`
                      : "More you might like"}
                  </p>
                  <ChevronDown className="h-6 w-6 animate-bounce text-white/80" />
                </div>
              </section>
            );
          }

          const product = card;
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
          const usesSharedCollectionImage =
            !isCollectionHero &&
            Boolean(heroImageUrl) &&
            product.images[0] === heroImageUrl;
          const isWishlisted = wishlistedIds.has(product.id);
          const isAdded = Boolean(isAddingToCart.get(product.id));
          const isDescriptionOpen = expandedDescriptionProductId === product.id;
          const orderedImages = (() => {
            if (!product.images?.length) return [];
            if (!isCollectionHero && product.images.length > 1) {
              return [
                { src: product.images[1], originalIndex: 1 },
                ...product.images
                  .map((src, index) => ({ src, originalIndex: index }))
                  .filter((entry) => entry.originalIndex !== 1),
              ];
            }
            return product.images.map((src, index) => ({ src, originalIndex: index }));
          })();

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

                      // If adding: filled red, if removing: outlined white.
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
                  className="reel-inner flex h-full overflow-x-scroll"
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
                {orderedImages.map(({ src: imageSrc, originalIndex }, imageIndex) => {
                  const failedForCard = imageErrorMap.get(product.id)?.has(originalIndex);
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
                        onError={() => handleImageError(product.id, originalIndex)}
                      />
                      {usesSharedCollectionImage && originalIndex === 0 ? (
                        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                          Collection View
                        </span>
                      ) : null}
                    </div>
                  );
                })}
                </div>

                {orderedImages.length > 1 ? (
                  <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-1.5">
                    {orderedImages.map((_, dotIndex) => (
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
                  onClick={(event) => handleProductNavigation(event, product.slug)}
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
                  {isCollectionHero ? (
                    <span className="inline-flex rounded-full bg-[#2D4A3E] px-2.5 py-1 text-xs text-white">
                      Full Collection
                    </span>
                  ) : product.collection_group ? (
                    <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                      {product.piece_type ?? "Collection Piece"}
                    </span>
                  ) : null}

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
                        <MessageCircle
                          className="h-[22px] w-[22px] text-white"
                        />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className={`h-[44px] w-full rounded-md bg-[#2D4A3E] px-4 text-center font-semibold text-white transition-colors active:bg-[#1E3329] ${
                      isCollectionHero &&
                      (product.bundle_skus?.length ?? 0) > 0 &&
                      nonHeroCollectionPieces.length > 0 &&
                      !isDescriptionOpen
                        ? ""
                        : "mt-auto"
                    }`}
                  >
                    {isAdded ? "Added ✓" : "Add to Cart"}
                  </button>

                  {isCollectionHero &&
                  (product.bundle_skus?.length ?? 0) > 0 &&
                  !isDescriptionOpen &&
                  nonHeroCollectionPieces.length > 0 ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="mb-2 mt-3 text-xs font-medium text-white/70">
                        What&apos;s in this collection
                      </div>
                      <div className="collection-pieces-row flex gap-2 overflow-x-auto pb-1">
                        {nonHeroCollectionPieces.map((piece) => {
                          const piecePrice = getPriceLabel(piece);
                          return (
                            <div
                              key={piece.id}
                              className="flex min-w-[90px] flex-shrink-0 items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-xs font-medium text-white">
                                  {piece.piece_type ?? "Piece"}
                                </div>
                                <div className="text-sm font-bold text-white">
                                  {piecePrice.sale}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToCart(piece)}
                                aria-label={`Add ${piece.piece_type ?? "piece"} to cart`}
                                className="h-6 w-6 shrink-0 rounded-full bg-[#2D4A3E] text-white transition-colors hover:bg-[#3B5E4F] active:bg-[#1E3329]"
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}

        {isLoadingMore ? (
          <section className="flex h-screen w-full snap-start items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-white/80" />
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
        .collection-pieces-row {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .collection-pieces-row::-webkit-scrollbar {
          display: none;
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

interface ReelTriggerProps {
  onClick: () => void;
  label?: string;
  variant?: "default" | "compact";
}

export function ReelTrigger({
  onClick,
  label = "Swipe to explore pieces",
  variant = "default",
}: ReelTriggerProps) {
  const isCompact = variant === "compact";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-col items-center gap-1 rounded-full bg-[#2D4A3E] text-white ${
        isCompact ? "px-3 py-1" : "px-5 py-3"
      }`}
      style={isCompact ? undefined : { animation: "reelPulse 2s ease-in-out infinite" }}
    >
      <span className={isCompact ? "text-xs font-medium" : "text-sm font-medium"}>
        {label}
      </span>
      <ChevronDown
        className={isCompact ? "h-3 w-3" : "h-4 w-4"}
        style={{ animation: "reelBounce 1.4s ease-in-out infinite" }}
      />
      <style jsx>{`
        @keyframes reelBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(8px);
          }
        }
        @keyframes reelPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
      `}</style>
    </button>
  );
}
