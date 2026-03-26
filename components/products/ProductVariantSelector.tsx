"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductVariant } from "@/types";
import { formatPrice } from "@/lib/format-price";

const SIZE_ORDER = [
  "2x3",
  "2x4",
  "2x8",
  "2x12",
  "3ft Round",
  "4x6",
  "5x8",
  "5ft Round",
  "7ft Round",
  "7x10",
  "8x11",
  "10x13",
  "Pillow",
  "Roll",
];

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  onVariantChange: (variant: ProductVariant | null) => void;
}

export default function ProductVariantSelector({
  variants,
  onVariantChange,
}: ProductVariantSelectorProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const isSingleVariant = variants.length === 1;

  const colors = useMemo(() => {
    const set = new Set<string>();
    for (const v of variants) {
      if (v.color != null && v.color.trim() !== "") set.add(v.color);
    }
    return Array.from(set).sort();
  }, [variants]);

  const allSizes = useMemo(
    () =>
      sortSizes(
        Array.from(
          new Set(
            variants.map((v) => v.size).filter((s): s is string => s != null && s !== "")
          )
        )
      ),
    [variants]
  );

  const noColorInData = colors.length === 0;

  const sizesForColor = useMemo(() => {
    if (selectedColor == null) return [];
    return sortSizes(
      Array.from(
        new Set(
          variants
            .filter((v) => v.color === selectedColor)
            .map((v) => v.size)
            .filter((s): s is string => s != null && s !== "")
        )
      )
    );
  }, [variants, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (noColorInData) {
      if (selectedSize == null) return null;
      return variants.find((v) => v.size === selectedSize) ?? null;
    }
    if (selectedColor == null || selectedSize == null) return null;
    return (
      variants.find((v) => v.color === selectedColor && v.size === selectedSize) ?? null
    );
  }, [variants, selectedColor, selectedSize, noColorInData]);

  useEffect(() => {
    onVariantChange(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  /* Single row in DB — lock selection */
  useEffect(() => {
    if (!isSingleVariant) return;
    const v = variants[0];
    setSelectedColor(v.color ?? null);
    setSelectedSize(v.size ?? null);
  }, [isSingleVariant, variants]);

  /* Auto-select single color */
  useEffect(() => {
    if (isSingleVariant) return;
    if (colors.length === 1 && selectedColor !== colors[0]) {
      setSelectedColor(colors[0]);
    }
  }, [colors, selectedColor, isSingleVariant]);

  /* When only one size exists for the selected color, select it */
  useEffect(() => {
    if (isSingleVariant) return;
    if (!noColorInData && selectedColor == null) return;
    const pool = noColorInData ? allSizes : sizesForColor;
    if (pool.length === 1 && selectedSize !== pool[0]) {
      setSelectedSize(pool[0]);
    }
  }, [
    selectedColor,
    sizesForColor,
    selectedSize,
    isSingleVariant,
    noColorInData,
    allSizes,
  ]);

  function colorFullyOos(color: string): boolean {
    return variants.filter((v) => v.color === color).every((v) => !v.in_stock);
  }

  function variantForColorSize(color: string, size: string): ProductVariant | undefined {
    return variants.find((v) => v.color === color && v.size === size);
  }

  function handleColorClick(color: string) {
    setSelectedColor(color);
    setSelectedSize(null);
    if (
      selectedSize &&
      !variants.some((v) => v.color === color && v.size === selectedSize)
    ) {
      /* already cleared above */
    }
  }

  function handleSizeClick(size: string) {
    setSelectedSize(size);
  }

  if (variants.length === 0) return null;

  const sizeOptions = noColorInData ? allSizes : sizesForColor;
  const showSizeSection = noColorInData || selectedColor != null;

  return (
    <div className="mt-6 space-y-6">
      {/* Color */}
      {!noColorInData && (
      <div>
        <p className="mb-3 text-sm font-medium text-[#1C1C1C]">
          Color
          {selectedColor != null && (
            <span className="ml-1 font-semibold">: {selectedColor}</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const allOos = colorFullyOos(color);
            const active = selectedColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => handleColorClick(color)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-2 border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5]"
                    : allOos
                      ? "border border-[#1C1C1C]/10 bg-[#FAF8F5]/50 text-[#1C1C1C]/40 line-through opacity-50"
                      : "border border-[#1C1C1C]/15 bg-white text-[#1C1C1C] hover:border-[#2D4A3E]/40",
                ].join(" ")}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Size — only after color selected (or when product has no color dimension) */}
      {showSizeSection && (
        <div>
          <p className="mb-3 text-sm font-medium text-[#1C1C1C]">
            Size
            {selectedSize != null && (
              <span className="ml-1 font-semibold">: {selectedSize}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const v = noColorInData
                ? variants.find((x) => x.size === size)
                : variantForColorSize(selectedColor!, size);
              const oos = v ? !v.in_stock : true;
              const active = selectedSize === size;
              const priceTitle =
                v != null
                  ? `${formatPrice(Number(v.price))} — ${oos ? "Out of stock" : "In stock"}`
                  : undefined;

              let className =
                "rounded-full px-4 py-2 text-sm font-medium transition-colors ";
              if (active && !oos) {
                className +=
                  "cursor-pointer border-2 border-[#2D4A3E] bg-[#2D4A3E] text-[#FAF8F5] ";
              } else if (active && oos) {
                className +=
                  "cursor-pointer border border-red-300 bg-red-50 text-red-500 ";
              } else if (!oos) {
                className +=
                  "cursor-pointer border border-[#1C1C1C]/15 bg-white text-[#1C1C1C] ";
              } else {
                className +=
                  "cursor-pointer border border-[#1C1C1C]/10 text-[#1C1C1C]/40 line-through opacity-40 ";
              }
              if (!active && oos) {
                className += "opacity-50 line-through ";
              }

              return (
                <button
                  key={size}
                  type="button"
                  title={priceTitle}
                  onClick={() => handleSizeClick(size)}
                  className={className}
                >
                  {oos ? `✕ ${size}` : size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
