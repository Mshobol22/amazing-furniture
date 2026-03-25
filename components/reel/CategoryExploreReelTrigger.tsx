"use client";

import { ReelTrigger } from "@/components/reel/ProductReel";
import { useContextualReelContext } from "@/components/reel/ContextualReelProvider";

export default function CategoryExploreReelTrigger({
  categorySlug,
  categoryDisplayLabel,
  productId,
}: {
  categorySlug: string;
  categoryDisplayLabel: string;
  productId: string;
}) {
  const { openContextualReel } = useContextualReelContext();
  return (
    <ReelTrigger
      label={`Explore more ${categoryDisplayLabel}`}
      onClick={() =>
        void openContextualReel({
          context: "category",
          contextValue: categorySlug,
          firstProductId: productId,
          wordmarkLabel: categoryDisplayLabel,
        })
      }
    />
  );
}
