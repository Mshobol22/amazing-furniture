"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { proxyImage, FALLBACK_IMAGE } from "@/lib/utils";

interface ProductImageProps
  extends Omit<
    React.ComponentProps<typeof Image>,
    "src" | "onError"
  > {
  src: string | null | undefined;
  /** Used to proxy Nationwide FD images when the URL omits `nationwidefd.com`. */
  manufacturer?: string | null;
}

export function ProductImage({ src, alt, manufacturer, ...props }: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState(() => proxyImage(src, { manufacturer }));

  useEffect(() => {
    setImgSrc(proxyImage(src, { manufacturer }));
  }, [src, manufacturer]);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(FALLBACK_IMAGE)}
    />
  );
}
