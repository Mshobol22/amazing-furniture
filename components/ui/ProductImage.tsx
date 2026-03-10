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
}

export function ProductImage({ src, alt, ...props }: ProductImageProps) {
  const [imgSrc, setImgSrc] = useState(() => proxyImage(src));

  useEffect(() => {
    setImgSrc(proxyImage(src));
  }, [src]);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(FALLBACK_IMAGE)}
    />
  );
}
