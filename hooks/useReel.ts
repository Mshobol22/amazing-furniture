"use client";

import { useCallback, useState } from "react";
import type { Product } from "@/types";

interface ReelResponse {
  collectionPieces: Product[];
  relatedProducts: Product[];
  nextOffset: number;
  hasMore: boolean;
}

export function useReel() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCollection, setCurrentCollection] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState("");
  const [collectionPieces, setCollectionPieces] = useState<Product[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const open = useCallback(async (collectionGroup: string, category: string) => {
    const nextCategory = category?.trim() ?? "";
    setIsLoading(true);
    setCurrentCollection(collectionGroup);
    setCurrentCategory(nextCategory);
    setOffset(0);
    setHasMore(true);

    try {
      const params = new URLSearchParams({
        collection_group: collectionGroup,
        category: nextCategory,
        offset: "0",
        limit: "20",
      });
      const response = await fetch(`/api/reel?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch reel data");
      }

      const data = (await response.json()) as ReelResponse;
      setCollectionPieces(data.collectionPieces ?? []);
      setRelatedProducts(data.relatedProducts ?? []);
      setOffset(data.nextOffset ?? (data.relatedProducts?.length ?? 0));
      setHasMore(Boolean(data.hasMore));
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !currentCollection) {
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        collection_group: currentCollection,
        category: currentCategory,
        offset: String(offset),
        limit: "20",
      });
      const response = await fetch(`/api/reel?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load more reel products");
      }

      const data = (await response.json()) as ReelResponse;
      setRelatedProducts((prev) => [...prev, ...(data.relatedProducts ?? [])]);
      setOffset(data.nextOffset ?? offset);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setIsLoading(false);
    }
  }, [currentCategory, currentCollection, hasMore, isLoading, offset]);

  return {
    isOpen,
    open,
    close,
    currentCollection,
    currentCategory,
    collectionPieces,
    relatedProducts,
    isLoading,
    loadMore,
  };
}
