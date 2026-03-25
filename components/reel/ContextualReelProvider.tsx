"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import ContextualReel from "@/components/reel/ContextualReel";
import { useContextualReel } from "@/hooks/useContextualReel";
import type { ContextualReelEntry } from "@/hooks/useContextualReel";

type OpenArgs = {
  context: "brand" | "category";
  contextValue: string;
  filterValue?: string;
  firstProductId?: string;
  seed?: number;
  wordmarkLabel?: string;
};

type ContextualReelContextValue = {
  isOpen: boolean;
  openContextualReel: (args: OpenArgs) => Promise<void>;
  closeContextualReel: () => void;
  contextualReelProps: {
    entries: ContextualReelEntry[];
    phase: "1" | "2";
    hasMore: boolean;
    nextCursor: number | null;
    wordmarkLabel: string;
    isLoading: boolean;
    loadMore: () => Promise<void>;
    context: "brand" | "category" | null;
  };
};

const ContextualReelContext = createContext<ContextualReelContextValue | null>(null);

export function ContextualReelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    isOpen,
    open,
    close,
    entries,
    phase,
    hasMore,
    nextCursor,
    wordmarkLabel,
    isLoading,
    loadMore,
    context,
  } = useContextualReel();

  const isAdminRoute = pathname?.startsWith("/admin");

  const openContextualReel = useCallback(
    async (args: OpenArgs) => {
      close();
      await open(args);
    },
    [close, open]
  );

  const value = useMemo<ContextualReelContextValue>(
    () => ({
      isOpen,
      openContextualReel,
      closeContextualReel: close,
      contextualReelProps: {
        entries,
        phase,
        hasMore,
        nextCursor,
        wordmarkLabel,
        isLoading,
        loadMore,
        context,
      },
    }),
    [
      close,
      context,
      entries,
      hasMore,
      isLoading,
      isOpen,
      loadMore,
      nextCursor,
      openContextualReel,
      phase,
      wordmarkLabel,
    ]
  );

  return (
    <ContextualReelContext.Provider value={value}>
      {children}
      {!isAdminRoute ? (
        <ContextualReel isOpen={isOpen} onClose={close} {...value.contextualReelProps} />
      ) : null}
    </ContextualReelContext.Provider>
  );
}

export function useContextualReelContext() {
  const ctx = useContext(ContextualReelContext);
  if (!ctx) {
    throw new Error("useContextualReelContext must be used within ContextualReelProvider");
  }
  return ctx;
}
