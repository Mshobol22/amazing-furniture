"use client";

import ProductReel, { ReelTrigger } from "@/components/reel/ProductReel";
import { useReel } from "@/hooks/useReel";

interface ProductDetailReelTriggerProps {
  collectionGroup: string;
  category: string;
  label: string;
  initialWishlisted: string[];
}

export default function ProductDetailReelTrigger({
  collectionGroup,
  category,
  label,
  initialWishlisted,
}: ProductDetailReelTriggerProps) {
  const { isOpen, open, close, collectionPieces, relatedProducts, loadMore, isLoading } =
    useReel();
  const safeCategory = category?.trim() ?? "";
  const heroImageUrl =
    collectionPieces.find((p) => p.is_collection_hero)?.images?.[0] ?? undefined;

  return (
    <>
      <ReelTrigger
        label={label}
        onClick={() => {
          void open(collectionGroup, safeCategory);
        }}
      />
      <ProductReel
        isOpen={isOpen}
        onClose={close}
        collectionPieces={collectionPieces}
        relatedProducts={relatedProducts}
        category={safeCategory}
        heroImageUrl={heroImageUrl}
        initialWishlisted={initialWishlisted}
        onLoadMore={loadMore}
        isLoadingMore={isLoading}
      />
    </>
  );
}
