"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { proxyImage, FALLBACK_IMAGE } from "@/lib/utils";

/* ── helpers ─────────────────────────────────────────────────── */

function getImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.filter(
      (url: unknown) => typeof url === "string" && url.startsWith("http")
    );
  if (typeof raw === "string") {
    if (raw.includes(","))
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http"));
    if (raw.startsWith("http")) return [raw];
  }
  return [];
}

function clampIndex(index: number, length: number) {
  if (length === 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

/* ── lightbox ────────────────────────────────────────────────── */

function Lightbox({
  images,
  index,
  manufacturer,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  manufacturer?: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* prev */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* image */}
      <div
        className="relative h-[80vh] w-[90vw] max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={proxyImage(images[index], { manufacturer })}
          alt={`Image ${index + 1}`}
          fill
          className="object-contain"
          sizes="90vw"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
          }}
        />
      </div>

      {/* next */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* counter */}
      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/70">
        {index + 1} / {images.length}
      </span>
    </div>,
    document.body
  );
}

/* ── main gallery component ──────────────────────────────────── */

interface ProductImageGalleryProps {
  rawImages: unknown;
  productName: string;
  manufacturer?: string | null;
  onSale?: boolean;
  salePrice?: number | null;
  primaryImageUrl?: string | null;
}

export default function ProductImageGallery({
  rawImages,
  productName,
  manufacturer,
  onSale,
  salePrice,
  primaryImageUrl,
}: ProductImageGalleryProps) {
  const images = getImages(rawImages);
  const displayImages = useMemo(() => {
    if (!primaryImageUrl) return images;
    return [primaryImageUrl, ...images].filter(
      (url, index, arr) => arr.indexOf(url) === index
    );
  }, [images, primaryImageUrl]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeImageFailed, setActiveImageFailed] = useState(false);

  useEffect(() => {
    if (primaryImageUrl) setSelectedIndex(0);
  }, [primaryImageUrl]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef(0);

  const safe = clampIndex(selectedIndex, displayImages.length);
  const activeImage = displayImages[safe];
  const usesComingSoonCard =
    manufacturer === "ACME" || manufacturer === "Nationwide FD";
  const showComingSoonCard =
    usesComingSoonCard &&
    (displayImages.length === 0 ||
      activeImageFailed ||
      typeof activeImage !== "string" ||
      !activeImage.startsWith("http"));

  useEffect(() => {
    setActiveImageFailed(false);
  }, [activeImage]);

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i > 0 ? i - 1 : displayImages.length - 1));
  }, [displayImages.length]);

  const goNext = useCallback(() => {
    setSelectedIndex((i) => (i < displayImages.length - 1 ? i + 1 : 0));
  }, [displayImages.length]);

  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  /* zero images */
  if (displayImages.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[#2D4A3E] shadow-lg">
          <span className="text-lg font-medium text-[#FAF8F5]">
            Image Coming Soon
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── DESKTOP: thumbnails left + main right ────────── */}
      <div className="hidden md:flex gap-3">
        {/* Thumbnail strip — left 20% */}
        {displayImages.length > 1 && (
          <div className="flex w-[20%] flex-col gap-2 overflow-y-auto max-h-[500px]">
            {displayImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md transition-all duration-150 ${
                  i === safe
                    ? "border-2 border-[#2D4A3E] scale-105"
                    : "border-2 border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={proxyImage(img, { manufacturer })}
                  alt={`${productName} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Main image — right 80% */}
        <div
          className={`relative flex-1 aspect-[4/3] overflow-hidden rounded-2xl bg-gray-50 shadow-lg ${
            isZoomed ? "cursor-crosshair" : "cursor-pointer"
          }`}
          onClick={() => setIsLightboxOpen(true)}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setZoomOrigin(`${x}% ${y}%`);
          }}
        >
          {/* Sale badge */}
          {onSale && salePrice != null && (
            <span
              className="absolute left-3 top-3 z-10 rounded px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: "#DC2626" }}
            >
              SALE
            </span>
          )}

          {showComingSoonCard ? (
            <div className="flex h-full w-full items-center justify-center bg-[#2D4A3E]/10 px-4 text-center">
              <span className="font-sans text-base font-semibold text-[#2D4A3E]">
                Image coming soon
              </span>
            </div>
          ) : (
            <Image
              src={proxyImage(activeImage, { manufacturer })}
              alt={productName}
              fill
              className="object-contain transition-transform duration-150"
              style={{
                transform: isZoomed ? "scale(2)" : "scale(1)",
                transformOrigin: zoomOrigin,
              }}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              onError={(e) => {
                if (usesComingSoonCard) {
                  setActiveImageFailed(true);
                  return;
                }
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
          )}

          {/* Prev/Next arrows */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white transition-colors hover:bg-black/50"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white transition-colors hover:bg-black/50"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Counter */}
          <span className="absolute bottom-3 right-3 z-10 rounded bg-black/40 px-2 py-0.5 text-xs text-white">
            {safe + 1} / {displayImages.length}
          </span>
        </div>
      </div>

      {/* ── MOBILE: full-width carousel ──────────────────── */}
      <div className="md:hidden">
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-50 shadow-lg"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (diff > 50) goNext();
            else if (diff < -50) goPrev();
          }}
          onClick={() => setIsLightboxOpen(true)}
        >
          {/* Sale badge */}
          {onSale && salePrice != null && (
            <span
              className="absolute left-3 top-3 z-10 rounded px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: "#DC2626" }}
            >
              SALE
            </span>
          )}

          {showComingSoonCard ? (
            <div className="flex h-full w-full items-center justify-center bg-[#2D4A3E]/10 px-4 text-center">
              <span className="font-sans text-base font-semibold text-[#2D4A3E]">
                Image coming soon
              </span>
            </div>
          ) : (
            <Image
              src={proxyImage(activeImage, { manufacturer })}
              alt={productName}
              fill
              className="object-contain transition-opacity duration-150"
              priority
              sizes="100vw"
              onError={(e) => {
                if (usesComingSoonCard) {
                  setActiveImageFailed(true);
                  return;
                }
                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
              }}
            />
          )}

          {/* Counter */}
          {displayImages.length > 1 && (
            <span className="absolute bottom-3 right-3 z-10 rounded bg-black/40 px-2 py-0.5 text-xs text-white">
              {safe + 1} / {displayImages.length}
            </span>
          )}
        </div>

        {/* Dot indicators */}
        {displayImages.length > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {displayImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === safe ? "bg-[#2D4A3E]" : "bg-gray-300"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      {isLightboxOpen && (
        <Lightbox
          images={displayImages}
          index={safe}
          manufacturer={manufacturer}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  );
}
