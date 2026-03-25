"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, Loader2, X } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/types";

type ReelCard = Product | { type: "divider"; id: "divider-card" };

interface ProductReelProps {
  isOpen: boolean;
  onClose: () => void;
  collectionPieces: Product[];
  relatedProducts: Product[];
  initialWishlisted?: string[];
  onLoadMore?: () => Promise<void>;
  isLoadingMore?: boolean;
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

export default function ProductReel({
  isOpen,
  onClose,
  collectionPieces,
  relatedProducts,
  initialWishlisted = [],
  onLoadMore,
  isLoadingMore = false,
}: ProductReelProps) {
  const addItem = useCartStore((state) => state.addItem);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const outerScrollRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set([0]));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
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
        className="reel-outer h-screen overflow-y-scroll"
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
                  <p className="text-2xl font-light text-white">More you might like</p>
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
                className="reel-inner absolute inset-0 flex overflow-x-scroll"
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
                    </div>
                  );
                })}
              </div>

              <div
                className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-black/45 px-6 pb-10 pt-5 backdrop-blur-[12px] backdrop-saturate-[180%]"
                style={{
                  transform: visibleCards.has(cardIndex)
                    ? "translateY(0)"
                    : "translateY(100%)",
                  transition: "transform 0.35s ease-out",
                }}
              >
                {isCollectionHero ? (
                  <span className="mb-2 inline-flex rounded-full bg-[#2D4A3E] px-2.5 py-1 text-xs text-white">
                    Full Collection
                  </span>
                ) : product.collection_group ? (
                  <span className="mb-2 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs text-[#1C1C1C]">
                    {product.piece_type ?? "Collection Piece"}
                  </span>
                ) : null}

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

                <p className="mt-2 line-clamp-3 text-sm text-white/80">
                  {product.description}
                </p>

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
                          activeImageIndex === dotIndex
                            ? "bg-white"
                            : "bg-white/40"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
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
