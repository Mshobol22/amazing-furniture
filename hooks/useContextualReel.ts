"use client";

import { useCallback, useRef, useState } from "react";
import type { Product } from "@/types";

export type ContextualReelPhase = "1" | "2";

export type ContextualReelDivider = { _type: "phase-divider"; id: "__phase_divider__" };

export type ContextualReelEntry = Product | ContextualReelDivider;

export const CONTEXTUAL_REEL_DIVIDER: ContextualReelDivider = {
  _type: "phase-divider",
  id: "__phase_divider__",
};

export function isContextualReelDivider(e: ContextualReelEntry): e is ContextualReelDivider {
  return "_type" in e && e._type === "phase-divider";
}

interface ApiResponse {
  products: Product[];
  nextCursor: number | null;
  hasMore: boolean;
  phase: ContextualReelPhase;
  total: number;
}

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return sp.toString();
}

export function useContextualReel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<ContextualReelEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [phase, setPhase] = useState<ContextualReelPhase>("1");
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [seed, setSeed] = useState(0);
  const [context, setContext] = useState<"brand" | "category" | null>(null);
  const [contextValue, setContextValue] = useState("");
  const [filterValue, setFilterValue] = useState<string | undefined>();
  const [wordmarkLabel, setWordmarkLabel] = useState("");
  const firstProductIdRef = useRef<string | undefined>(undefined);
  const phase2StartedRef = useRef(false);

  const close = useCallback(() => {
    setIsOpen(false);
    firstProductIdRef.current = undefined;
    phase2StartedRef.current = false;
  }, []);

  const open = useCallback(
    async (args: {
      context: "brand" | "category";
      contextValue: string;
      filterValue?: string;
      firstProductId?: string;
      seed?: number;
      wordmarkLabel?: string;
    }) => {
      const nextSeed = args.seed ?? Math.floor(Math.random() * 1_000_000_000);
      setSeed(nextSeed);
      setContext(args.context);
      setContextValue(args.contextValue);
      setFilterValue(args.filterValue);
      firstProductIdRef.current = args.firstProductId;
      phase2StartedRef.current = false;
      const label =
        args.wordmarkLabel?.trim() ||
        args.contextValue
          .split(/[-_]/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      setWordmarkLabel(label);

      setIsLoading(true);
      setPhase("1");
      try {
        const qs = buildQuery({
          context: args.context,
          context_value: args.contextValue,
          filter_value: args.filterValue,
          cursor: "0",
          limit: "20",
          seed: String(nextSeed),
          phase: "1",
          first_product_id: args.firstProductId,
        });
        const res = await fetch(`/api/contextual-reel?${qs}`);
        if (!res.ok) throw new Error("contextual reel");
        const data = (await res.json()) as ApiResponse;
        setEntries(data.products ?? []);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
        setTotal(data.total ?? 0);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (isLoading || !context) return;

    if (nextCursor != null) {
      setIsLoading(true);
      try {
        const qs = buildQuery({
          context,
          context_value: contextValue,
          filter_value: filterValue,
          cursor: String(nextCursor),
          limit: "20",
          seed: String(seed),
          phase,
        });
        const res = await fetch(`/api/contextual-reel?${qs}`);
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        setEntries((prev) => {
          const seen = new Set(
            prev.filter((e): e is Product => !isContextualReelDivider(e)).map((p) => p.id)
          );
          const merged: ContextualReelEntry[] = [...prev];
          for (const p of data.products ?? []) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          }
          return merged;
        });
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (phase === "1" && !phase2StartedRef.current) {
      phase2StartedRef.current = true;
      setIsLoading(true);
      try {
        const qs = buildQuery({
          context,
          context_value: contextValue,
          filter_value: filterValue,
          cursor: "0",
          limit: "20",
          seed: String(seed),
          phase: "2",
        });
        const res = await fetch(`/api/contextual-reel?${qs}`);
        if (!res.ok) {
          phase2StartedRef.current = false;
          return;
        }
        const data = (await res.json()) as ApiResponse;
        setEntries((prev) => {
          const seen = new Set(
            prev.filter((e): e is Product => !isContextualReelDivider(e)).map((p) => p.id)
          );
          const hadPhase1Products = prev.some((e) => !isContextualReelDivider(e));
          const merged: ContextualReelEntry[] = hadPhase1Products
            ? [...prev, CONTEXTUAL_REEL_DIVIDER]
            : [...prev];
          for (const p of data.products ?? []) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              merged.push(p);
            }
          }
          return merged;
        });
        setPhase("2");
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
        setTotal(data.total ?? 0);
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    context,
    contextValue,
    filterValue,
    isLoading,
    nextCursor,
    phase,
    seed,
  ]);

  const currentContext = context ? `${context}:${contextValue}` : "";

  return {
    isOpen,
    open,
    close,
    entries,
    phase,
    isLoading,
    loadMore,
    nextCursor,
    hasMore,
    total,
    seed,
    currentContext,
    context,
    contextValue,
    filterValue,
    wordmarkLabel,
  };
}
