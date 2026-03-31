"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { cn, FALLBACK_IMAGE, proxyImage } from "@/lib/utils";

interface ProductCardImageProps {
  src: string | null | undefined;
  alt: string;
  manufacturer?: string | null;
  sizes?: string;
  imageClassName?: string;
  cardClassName?: string;
}

function ImageComingSoonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded bg-[#2D4A3E]/10 px-3 text-center",
        className
      )}
      role="img"
      aria-label="Image coming soon"
    >
      <span className="font-sans text-sm font-semibold text-[#2D4A3E]">
        Image coming soon
      </span>
    </div>
  );
}

export function ProductCardImage({
  src,
  alt,
  manufacturer,
  sizes,
  imageClassName,
  cardClassName,
}: ProductCardImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = useMemo(() => {
    if (manufacturer === "ACME") {
      return proxyImage(src, { manufacturer });
    }
    if (typeof src === "string" && src.startsWith("https://")) {
      return src;
    }
    return FALLBACK_IMAGE;
  }, [src, manufacturer]);

  const usesComingSoonCard = manufacturer === "ACME";
  const missingOrInvalid = typeof src !== "string" || !src.startsWith("https://");
  const shouldShowComingSoonCard =
    usesComingSoonCard &&
    (failed || missingOrInvalid || resolvedSrc === FALLBACK_IMAGE);

  if (shouldShowComingSoonCard) {
    return <ImageComingSoonCard className={cardClassName} />;
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      fill
      className={imageClassName}
      sizes={sizes}
      onError={() => {
        if (usesComingSoonCard) {
          setFailed(true);
          return;
        }
      }}
    />
  );
}
