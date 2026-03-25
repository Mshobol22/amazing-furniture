"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DiscoverReel from "@/components/reel/DiscoverReel";
import type { Product } from "@/types";

type DiscoverResponse = {
  products: Product[];
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
};

export default function DiscoverPage() {
  const seedRef = useRef<number>(Math.floor(Math.random() * 99999));
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitial() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/discover?limit=20&seed=${seedRef.current}`
        );
        if (!response.ok) {
          throw new Error("Failed to load discover products");
        }
        const payload = (await response.json()) as DiscoverResponse;
        setProducts(payload.products ?? []);
        setNextCursor(payload.nextCursor ?? null);
      } catch {
        setError("Unable to load discover feed right now.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitial();
  }, []);

  return (
    <div className="fixed inset-0 z-30 bg-black md:bg-[#111]">
      <div className="relative h-screen w-[100vw] md:w-full md:max-w-[480px] md:mx-auto">
        <Link
          href="/"
          className="absolute left-4 top-4 z-[60] rounded-full bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3B5E4F]"
        >
          ← Back
        </Link>

        {isLoading ? (
          <div className="flex h-screen w-full items-center justify-center text-white/80">
            Loading discover...
          </div>
        ) : error ? (
          <div className="flex h-screen w-full flex-col items-center justify-center gap-3 px-4 text-center text-white/90">
            <p>{error}</p>
            <Link
              href="/"
              className="rounded-md bg-[#2D4A3E] px-4 py-2 text-sm font-medium text-white"
            >
              Return home
            </Link>
          </div>
        ) : (
          <DiscoverReel
            initialProducts={products}
            initialNextCursor={nextCursor}
            seed={seedRef.current}
          />
        )}
      </div>
    </div>
  );
}
