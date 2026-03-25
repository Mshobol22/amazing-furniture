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

  return (
    <>
      <ReelTrigger
        label={label}
        onClick={() => {
          void open(collectionGroup, category);
        }}
      />
      <ProductReel
        isOpen={isOpen}
        onClose={close}
        collectionPieces={collectionPieces}
        relatedProducts={relatedProducts}
        initialWishlisted={initialWishlisted}
        onLoadMore={loadMore}
        isLoadingMore={isLoading}
      />
    </>
  );
}
