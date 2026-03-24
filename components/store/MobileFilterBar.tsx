"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ProductSidebar from "@/components/store/ProductSidebar";
import SortDropdown from "@/components/store/SortDropdown";
import type { FilterMetaRow } from "@/lib/filters";

const ARRAY_KEYS = ["manufacturer", "category", "color", "material", "collection"];

function useActiveFilterCount() {
  const searchParams = useSearchParams();
  let count = 0;
  for (const key of ARRAY_KEYS) {
    count += searchParams.get(key)?.split(",").filter(Boolean).length ?? 0;
  }
  if (searchParams.get("in_stock") === "true") count++;
  if (searchParams.get("on_sale") === "true") count++;
  if (searchParams.get("price_min")) count++;
  if (searchParams.get("price_max")) count++;
  return count;
}

interface MobileFilterBarProps {
  filterMeta: FilterMetaRow[];
  total: number;
  hideBrand?: boolean;
  hideCategory?: boolean;
}

export default function MobileFilterBar({
  filterMeta,
  total,
  hideBrand,
  hideCategory,
}: MobileFilterBarProps) {
  const [open, setOpen] = useState(false);
  const activeCount = useActiveFilterCount();

  return (
    <>
      {/* Sticky bar — mobile only */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-[#FAF8F5] px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-[#1C1C1C]"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-[20px] animate-[scale-pulse_0.2s_ease] items-center justify-center rounded-full bg-[#2D4A3E] px-1 text-xs text-[#FAF8F5]">
              {activeCount}
            </span>
          )}
        </button>

        <SortDropdown />
      </div>

      {/* Slide-up sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="flex w-[300px] max-w-full flex-col overflow-hidden bg-[#FAF8F5] p-0"
        >
          <SheetHeader className="shrink-0 border-b border-gray-100 px-6 py-4">
            <SheetTitle className="font-sans text-lg font-semibold text-[#1C1C1C]">
              Filters
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <ProductSidebar
              filterMeta={filterMeta}
              hideBrand={hideBrand}
              hideCategory={hideCategory}
            />
          </div>

          <div className="shrink-0 border-t border-gray-100 bg-[#FAF8F5] px-6 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-[#2D4A3E] py-2.5 text-sm font-medium text-[#FAF8F5] transition-colors hover:bg-[#3B5E4F]"
            >
              Show {total.toLocaleString()} Result{total !== 1 ? "s" : ""}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
