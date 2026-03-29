"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format-price";
import { getStorefrontListPrice } from "@/lib/zinatex-product-display";
import { cn } from "@/lib/utils";

function finishLabel(p: Product): string {
  const f = p.finish != null ? String(p.finish).trim() : "";
  return f || p.name || "Finish";
}

function variantShelfPrice(p: Product): number {
  const list = getStorefrontListPrice(p);
  if (
    p.on_sale &&
    p.sale_price != null &&
    p.sale_price < list
  ) {
    return p.sale_price;
  }
  return list;
}

interface AcmeFinishVariantSelectorProps {
  currentProductId: string;
  variants: Product[];
}

export default function AcmeFinishVariantSelector({
  currentProductId,
  variants,
}: AcmeFinishVariantSelectorProps) {
  const router = useRouter();

  const sorted = useMemo(() => {
    return [...variants].sort((a, b) =>
      finishLabel(a).localeCompare(finishLabel(b), undefined, {
        sensitivity: "base",
      })
    );
  }, [variants]);

  const pricesDiffer = useMemo(() => {
    const set = new Set(sorted.map(variantShelfPrice));
    return set.size > 1;
  }, [sorted]);

  if (sorted.length <= 1) return null;

  return (
    <div className="mt-4">
      <p className="mb-3 font-sans text-sm font-medium text-[#1C1C1C]">Finish</p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((v) => {
          const active = v.id === currentProductId;
          const oos = v.in_stock === false;
          const shelf = variantShelfPrice(v);
          const list = getStorefrontListPrice(v);
          const showStrike = v.on_sale && v.sale_price != null && v.sale_price < list;

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                if (!active) router.push(`/products/${v.slug}`);
              }}
              aria-current={active ? "true" : undefined}
              aria-label={
                active
                  ? `Selected finish: ${finishLabel(v)}`
                  : `View ${finishLabel(v)}`
              }
              className={cn(
                "relative flex min-w-0 max-w-full flex-col items-start gap-0.5 rounded px-3 py-1.5 text-left font-sans text-xs transition-colors sm:text-sm",
                active
                  ? "cursor-default border-2 border-[#2D4A3E] bg-[#2D4A3E] font-medium text-white"
                  : "cursor-pointer border border-[#1C1C1C] text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]",
                oos && !active && "opacity-80"
              )}
            >
              <span className="line-clamp-2 leading-snug">{finishLabel(v)}</span>
              {pricesDiffer ? (
                <span
                  className={cn(
                    "tabular-nums text-[11px] font-semibold sm:text-xs",
                    active ? "text-white/90" : "text-[#1C1C1C]/80"
                  )}
                >
                  {showStrike ? (
                    <>
                      <span className={active ? "text-red-200" : "text-red-600"}>
                        {formatPrice(shelf)}
                      </span>
                      <span
                        className={cn(
                          "ml-1 font-normal line-through opacity-80",
                          active ? "text-white/70" : "text-[#1C1C1C]/45"
                        )}
                      >
                        {formatPrice(list)}
                      </span>
                    </>
                  ) : (
                    formatPrice(shelf)
                  )}
                </span>
              ) : null}
              {oos && (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full rounded"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <line
                    x1="5"
                    y1="5"
                    x2="95"
                    y2="95"
                    stroke="#dc2626"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
