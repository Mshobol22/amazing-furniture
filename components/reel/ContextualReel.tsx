"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";
import { zinatexColorNameToCss } from "@/components/reel/zinatex-reel-colors";
import { proxyImage } from "@/lib/utils";
import {
  formatReelSecondaryPillText,
  getReelOverlaySecondaryLabel,
  getReelOverlayTitle,
  getReelPriceLabel,
} from "@/lib/reel-product-display";
import {
  isContextualReelDivider,
  type ContextualReelEntry,
} from "@/hooks/useContextualReel";
import {
  fetchZinatexColorVariantsForReel,
  shouldFetchZinatexReelVariants,
} from "@/lib/zinatex-reel-variants";

type ReelSlide = {
  product: Product;
  imageUrl: string;
  errorProductId: string;
  errorImageIndex: number;
  showCollectionViewBadge?: boolean;
};

interface ContextualReelProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ContextualReelEntry[];
  phase: "1" | "2";
  hasMore: boolean;
  nextCursor: number | null;
  wordmarkLabel: string;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  context: "brand" | "category" | null;
}

const PLACEHOLDER_IMAGE = "/images/placeholder-product.svg";

export default function ContextualReel({
  isOpen,
  onClose,
  entries,
  phase,
  hasMore,
  nextCursor,
  wordmarkLabel,
  isLoading,
  loadMore,
  context,
}: ContextualReelProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const addVariantItem = useCartStore((state) => state.addVariantItem);
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
  const activeImageIndexMapRef = useRef(activeImageIndexMap);
  activeImageIndexMapRef.current = activeImageIndexMap;
  const [variantsMap, setVariantsMap] = useState<Map<string, Product[]>>(new Map());
  const variantsFetchStartedRef = useRef<Set<string>>(new Set());
  const slidesByProductRef = useRef<Map<string, ReelSlide[]>>(new Map());

  const fetchColorVariants = useCallback(
    (product: Product) => fetchZinatexColorVariantsForReel(product),
    []
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
      onClose();
      router.push(`/products/${slug}`);
    },
    [onClose, router]
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

  const productIdsFromEntries = useMemo(
    () =>
      entries
        .filter((e): e is Product => !isContextualReelDivider(e))
        .map((p) => p.id),
    [entries]
  );

  useEffect(() => {
    fetchWishlistStatus(productIdsFromEntries);
  }, [fetchWishlistStatus, productIdsFromEntries]);

  const triggerLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || isLoading) return;
    const shouldPhaseAdvance = nextCursor == null && phase === "1" && !hasMore;
    const shouldPaginate = nextCursor != null;
    if (!shouldPhaseAdvance && !shouldPaginate) return;
    loadingMoreRef.current = true;
    try {
      await loadMore();
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, isLoading, loadMore, nextCursor, phase]);

  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const nextCursorRef = useRef(nextCursor);
  nextCursorRef.current = nextCursor;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  useEffect(() => {
    if (!isOpen) return;
    if (entries.length > 0) return;
    if (phase !== "1" || hasMore || isLoading) return;
    void triggerLoadMore();
  }, [entries.length, hasMore, isLoading, isOpen, phase, triggerLoadMore]);

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
    const observer = new IntersectionObserver(
      (ioEntries) => {
        setVisibleCards((prev) => {
          const next = new Set(prev);
          ioEntries.forEach((entry) => {
            const index = Number(entry.target.getAttribute("data-card-index"));
            if (entry.isIntersecting) {
              next.add(index);
              const card = entriesRef.current[index];
              if (
                card &&
                !isContextualReelDivider(card) &&
                shouldFetchZinatexReelVariants(card) &&
                !variantsFetchStartedRef.current.has(card.id)
              ) {
                variantsFetchStartedRef.current.add(card.id);
                void fetchColorVariants(card).then((variants) => {
                  setVariantsMap((prevMap) => new Map(prevMap).set(card.id, variants));
                });
              }
              if (entry.intersectionRatio > 0.65) {
                setActiveCardIndex(index);
              }
              const len = entriesRef.current.length;
              const nearEnd = index >= len - 3;
              const canPaginate = nextCursorRef.current != null;
              const canStartPhase2 =
                phaseRef.current === "1" && !hasMoreRef.current && nextCursorRef.current == null;
              if (nearEnd && (canPaginate || canStartPhase2) && !isLoadingRef.current) {
                void triggerLoadMore();
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
  }, [entries.length, fetchColorVariants, triggerLoadMore]);

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
      if (product.zinatex_reel_variant) {
        addVariantItem(product, product.zinatex_reel_variant, 1);
      } else {
        addItem(product, 1);
      }
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
    [addItem, addVariantItem]
  );

  const hiddenCardIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const item of entries) {
      if (isContextualReelDivider(item)) continue;
      const imageCount = item.images?.length ?? 0;
      const failedCount = imageErrorMap.get(item.id)?.size ?? 0;
      if (imageCount > 0 && failedCount >= imageCount) {
        hidden.add(item.id);
      }
    }
    return hidden;
  }, [entries, imageErrorMap]);

  const heroImageByGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of entries) {
      if (isContextualReelDivider(item)) continue;
      if (!item.collection_group || !item.is_collection_hero) continue;
      const lead = item.images?.[0];
      if (typeof lead === "string" && lead.length > 0) {
        map.set(item.collection_group, lead);
      }
    }
    return map;
  }, [entries]);

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
      <div className="pointer-events-none fixed right-4 top-4 z-50 max-w-[min(280px,70vw)] text-right text-sm font-light text-white/90">
        {wordmarkLabel}
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
        {entries.map((entry, cardIndex) => {
          if (isContextualReelDivider(entry)) {
            const title =
              context === "brand"
                ? "More furniture you might like"
                : "Explore more styles";
            const subtitle =
              context === "brand" ? "From other brands" : "From other categories";
            return (
              <section
                key={entry.id}
                ref={(el) => {
                  cardRefs.current[cardIndex] = el;
                }}
                data-card-index={cardIndex}
                className="relative flex h-[100dvh] w-full shrink-0 snap-start flex-col items-center justify-center overflow-hidden bg-[#2D4A3E] px-6 text-center text-white"
              >
                <p className="text-2xl font-semibold tracking-tight">{title}</p>
                <p className="mt-2 text-base font-light text-white/85">{subtitle}</p>
                <ChevronDown
                  className="ctx-reel-divider-arrow mt-8 h-8 w-8 text-white/90"
                />
              </section>
            );
          }

          const product = entry;

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

          const activeImageIndex = activeImageIndexMap.get(product.id) ?? 0;
          const isCollectionHero = Boolean(product.is_collection_hero);
          const groupHeroImage = product.collection_group
            ? heroImageByGroup.get(product.collection_group)
            : null;
          const usesSharedCollectionImage =
            !isCollectionHero &&
            Boolean(groupHeroImage) &&
            product.images[0] === groupHeroImage;
          const isDescriptionOpen = expandedDescriptionProductId === product.id;

          const variants = variantsMap.get(product.id) ?? [];
          const orderedImages = (() => {
            if (!product.images?.length) return [];
            if (!isCollectionHero && product.images.length > 1) {
              // For United Furniture / ACME, index 1 is the first "real" piece image
              // (index 0 may be a room scene or otherwise non-isolated lead).
              return [
                { src: product.images[1], originalIndex: 1 },
                ...product.images
                  .map((src, index) => ({ src, originalIndex: index }))
                  .filter((entry) => entry.originalIndex !== 1),
              ];
            }
            return product.images.map((src, originalIndex) => ({
              src,
              originalIndex,
            }));
          })();

          const baseSlides: ReelSlide[] = orderedImages.map(
            ({ src, originalIndex }) => ({
              product,
              imageUrl: src,
              errorProductId: product.id,
              errorImageIndex: originalIndex,
              showCollectionViewBadge: Boolean(
                usesSharedCollectionImage && originalIndex === 0
              ),
            })
          );
          const slides: ReelSlide[] =
            product.manufacturer === "Zinatex"
              ? [
                  ...baseSlides,
                  ...variants
                    .filter((v) => v.images?.[0])
                    .map((v) => ({
                      product: v,
                      imageUrl: v.images[0],
                      errorProductId: v.id,
                      errorImageIndex: 0,
                      showCollectionViewBadge: false,
                    })),
                ]
              : baseSlides;

          slidesByProductRef.current.set(product.id, slides);

          const clampedSlideIndex = Math.min(
            activeImageIndex,
            Math.max(0, slides.length - 1)
          );
          const activeSlide = slides[clampedSlideIndex];
          const activeProduct = activeSlide?.product ?? product;
          const activePrice = getReelPriceLabel(activeProduct);
          const reelSecondaryLabel = getReelOverlaySecondaryLabel(activeProduct);
          const reelTitle = getReelOverlayTitle(activeProduct);
          const isWishlisted = wishlistedIds.has(activeProduct.id);
          const isAdded = Boolean(isAddingToCart.get(activeProduct.id));
          const useColorDots =
            slides.length > 1 &&
            product.manufacturer === "Zinatex" &&
            variants.length > 0;

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

                    const slideList = slidesByProductRef.current.get(product.id) ?? [];
                    const idx = activeImageIndexMapRef.current.get(product.id) ?? 0;
                    const c = Math.min(idx, Math.max(0, slideList.length - 1));
                    const tapProduct = slideList[c]?.product ?? product;
                    const wasWishlisted = wishlistedIds.has(tapProduct.id);
                    void (async () => {
                      const didToggle = await toggleWishlist(tapProduct.id);
                      if (!didToggle) return;

                      setImageHeartBurst({
                        productId: tapProduct.id,
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
                    pendingSingleTapSlugRef.current = null;
                    lastTapAtRef.current = 0;
                    const slideList = slidesByProductRef.current.get(product.id) ?? [];
                    const idx = activeImageIndexMapRef.current.get(product.id) ?? 0;
                    const c = Math.min(idx, Math.max(0, slideList.length - 1));
                    const ap = slideList[c]?.product ?? product;
                    navigateToProduct(ap.slug);
                  }, 250);
                }}
                onClick={(event) => {
                  const now = Date.now();
                  if (now < clickSuppressedUntilRef.current) return;
                  if (event.detail > 1) return;
                  const slideList = slidesByProductRef.current.get(product.id) ?? [];
                  const idx = activeImageIndexMapRef.current.get(product.id) ?? 0;
                  const c = Math.min(idx, Math.max(0, slideList.length - 1));
                  const ap = slideList[c]?.product ?? product;
                  navigateToProduct(ap.slug);
                }}
              >
                {imageHeartBurst &&
                slides.some((s) => s.product.id === imageHeartBurst.productId) ? (
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
                  {slides.map((slide, imageIndex) => {
                    const failedForCard = imageErrorMap
                      .get(slide.errorProductId)
                      ?.has(slide.errorImageIndex);
                    const src = failedForCard
                      ? PLACEHOLDER_IMAGE
                      : proxyImage(slide.imageUrl, { manufacturer: slide.product.manufacturer });
                    const priority = cardIndex === 0 && imageIndex === 0;
                    const collectionName = slide.product.collection?.trim();

                    return (
                      <div
                        key={`${slide.errorProductId}-${imageIndex}-${slide.imageUrl}`}
                        className="relative h-full w-full shrink-0 snap-start"
                        style={{ background: "#111" }}
                      >
                        <Image
                          src={src}
                          alt={getReelOverlayTitle(slide.product)}
                          fill
                          style={{ objectFit: "contain" }}
                          priority={priority}
                          loading={priority ? undefined : "lazy"}
                          onError={() =>
                            handleImageError(slide.errorProductId, slide.errorImageIndex)
                          }
                        />
                        {collectionName ? (
                          <span className="absolute left-2 top-2 rounded-full bg-[#2D4A3E] px-2 py-1 text-xs text-white">
                            Part of {collectionName}
                          </span>
                        ) : null}
                        {slide.showCollectionViewBadge ? (
                          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                            Collection View
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {slides.length > 1 ? (
                <div
                  className="pointer-events-none absolute bottom-4 left-0 right-0 z-[12] flex items-center justify-center gap-1.5"
                  style={{
                    opacity: overlayVisible ? 1 : 0,
                    transition: "opacity 0.3s ease-out",
                  }}
                >
                  {slides.map((slide, dotIndex) => {
                    const dotColor = zinatexColorNameToCss(slide.product.color);
                    if (useColorDots) {
                      const active = activeImageIndex === dotIndex;
                      return (
                        <span
                          key={`${product.id}-dot-${dotIndex}`}
                          className="rounded-full border border-white"
                          style={{
                            width: 6,
                            height: 6,
                            backgroundColor: dotColor,
                            opacity: active ? 1 : 0.5,
                            transform: active ? "scale(1.4)" : "scale(1)",
                            transition: "opacity 0.2s, transform 0.2s",
                          }}
                        />
                      );
                    }
                    return (
                      <span
                        key={`${product.id}-dot-${dotIndex}`}
                        className={`h-1.5 w-1.5 rounded-full ${
                          activeImageIndex === dotIndex ? "bg-white" : "bg-white/40"
                        }`}
                      />
                    );
                  })}
                </div>
              ) : null}

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[14] h-52 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                style={{
                  opacity: overlayVisible ? 1 : 0,
                  transition: "opacity 0.3s ease-out",
                }}
              />

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
                    {activeProduct.manufacturer ? (
                      <span className="inline-flex rounded-full border border-white/20 bg-black/55 px-2.5 py-1 text-xs text-white shadow-sm backdrop-blur-[2px]">
                        {activeProduct.manufacturer}
                      </span>
                    ) : null}
                    {reelSecondaryLabel ? (
                      <span className="inline-flex rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-xs capitalize text-white shadow-sm backdrop-blur-[2px]">
                        {formatReelSecondaryPillText(reelSecondaryLabel)}
                      </span>
                    ) : null}
                  </div>

                  <h2
                    className="mt-1 line-clamp-2 text-lg font-bold text-white"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {reelTitle}
                  </h2>

                  {activeProduct.color ? (
                    <span className="mt-1 inline-flex rounded-full border border-white/20 bg-black/50 px-2 py-0.5 text-xs text-white shadow-sm backdrop-blur-[2px]">
                      {activeProduct.color}
                    </span>
                  ) : null}

                  <div
                    className="mt-1 text-xl font-bold text-white"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                  >
                    {activePrice.regular ? (
                      <>
                        <span>{activePrice.sale}</span>
                        <span className="ml-2 text-base font-bold text-white/70 line-through">
                          {activePrice.regular}
                        </span>
                      </>
                    ) : (
                      <span>{activePrice.sale}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(activeProduct)}
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
                    void toggleWishlist(activeProduct.id);
                  }}
                  className="flex flex-col items-center gap-1.5 bg-transparent p-0 text-white"
                  aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-[1px]">
                    <Heart
                      size={28}
                      strokeWidth={isWishlisted ? 0 : 2}
                      className={
                        isWishlisted
                          ? "fill-[#ef4444] text-[#ef4444] drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                          : "fill-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                      }
                    />
                  </span>
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
                  className="flex flex-col items-center gap-1.5 bg-transparent p-0 text-white"
                  aria-label={
                    isDescriptionOpen ? "Close description" : "Open description"
                  }
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-[1px]">
                    <MessageCircle
                      size={28}
                      className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                    />
                  </span>
                  <span className="text-xs text-white/80">Details</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToProduct(activeProduct.slug);
                  }}
                  className="flex flex-col items-center gap-1.5 bg-transparent p-0 text-white"
                  aria-label="View product page"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 shadow-md backdrop-blur-[1px]">
                    <ExternalLink
                      size={28}
                      className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
                    />
                  </span>
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
                    aria-labelledby={`contextual-desc-title-${product.id}`}
                  >
                    <div className="mb-4 flex justify-center">
                      <div className="h-1 w-10 rounded-full bg-white/80" />
                    </div>
                    <p
                      id={`contextual-desc-title-${product.id}`}
                      className="mb-1 text-base font-semibold text-white"
                    >
                      {reelTitle}
                    </p>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {activeProduct.manufacturer ? (
                        <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                          {activeProduct.manufacturer}
                        </span>
                      ) : null}
                    {reelSecondaryLabel ? (
                        <span className="inline-flex rounded-full bg-white/60 px-2.5 py-1 text-xs capitalize text-[#1C1C1C]">
                        {formatReelSecondaryPillText(reelSecondaryLabel)}
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-3 text-xl font-bold text-white">
                      {activePrice.regular ? (
                        <>
                          <span>{activePrice.sale}</span>
                          <span className="ml-2 text-base font-bold text-white/50 line-through">
                            {activePrice.regular}
                          </span>
                        </>
                      ) : (
                        <span>{activePrice.sale}</span>
                      )}
                    </div>
                    <p className="text-sm leading-[1.6] text-white/80">
                      {activeProduct.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedDescriptionProductId(null);
                        navigateToProduct(activeProduct.slug);
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
        @keyframes ctxReelBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(10px);
          }
        }
        .ctx-reel-divider-arrow {
          animation: ctxReelBounce 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
