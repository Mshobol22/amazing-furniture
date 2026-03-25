"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import ProductReel from "@/components/reel/ProductReel";
import { useReel } from "@/hooks/useReel";
import type { Product } from "@/types";

type ReelProps = {
  collectionPieces: Product[];
  relatedProducts: Product[];
  heroImageUrl?: string;
  loadMore: () => Promise<void>;
  isLoading: boolean;
};

type ReelContextValue = {
  isOpen: boolean;
  openReel: (collectionGroup: string, category: string) => Promise<void>;
  closeReel: () => void;
  reelProps: ReelProps;
};

const ReelContext = createContext<ReelContextValue | null>(null);

export function ReelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isOpen, open, close, collectionPieces, relatedProducts, loadMore, isLoading } =
    useReel();
  const heroImageUrl =
    collectionPieces.find((p) => p.is_collection_hero)?.images?.[0] ?? undefined;
  const isAdminRoute = pathname?.startsWith("/admin");

  const openReel = useCallback(
    async (collectionGroup: string, category: string) => {
      close();
      await open(collectionGroup, category);
    },
    [close, open]
  );

  const value = useMemo<ReelContextValue>(
    () => ({
      isOpen,
      openReel,
      closeReel: close,
      reelProps: {
        collectionPieces,
        relatedProducts,
        heroImageUrl,
        loadMore,
        isLoading,
      },
    }),
    [
      collectionPieces,
      close,
      heroImageUrl,
      isLoading,
      isOpen,
      loadMore,
      openReel,
      relatedProducts,
    ]
  );

  return (
    <ReelContext.Provider value={value}>
      {children}
      {!isAdminRoute ? (
        <ProductReel
          isOpen={isOpen}
          onClose={close}
          collectionPieces={collectionPieces}
          relatedProducts={relatedProducts}
          heroImageUrl={heroImageUrl}
          onLoadMore={loadMore}
          isLoadingMore={isLoading}
          initialWishlisted={[]}
        />
      ) : null}
    </ReelContext.Provider>
  );
}

export function useReelContext() {
  const context = useContext(ReelContext);
  if (!context) {
    throw new Error("useReelContext must be used within ReelProvider");
  }
  return context;
}
