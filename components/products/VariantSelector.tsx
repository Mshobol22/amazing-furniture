"use client";

import { useState, useEffect, useMemo } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { ProductVariant } from "@/types";

/* ── size sort order ──────────────────────────────────────────── */

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

/* ── props ────────────────────────────────────────────────────── */

interface VariantSelectorProps {
  variants: ProductVariant[];
  productId: string;
  productName: string;
  onVariantChange?: (variant: ProductVariant | null) => void;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
}

/* ── component ────────────────────────────────────────────────── */

export default function VariantSelector({
  variants,
  onVariantChange,
  onAddToCart,
}: VariantSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  /* derived unique sizes & colors */
  const allSizes = useMemo(
    () => sortSizes(
      Array.from(new Set(variants.map((v) => v.size).filter(Boolean) as string[]))
    ),
    [variants]
  );
  const allColors = useMemo(
    () => Array.from(
      new Set(variants.map((v) => v.color).filter(Boolean) as string[])
    ).sort(),
    [variants]
  );

  const showSizeSelector = allSizes.length > 1;
  const showColorSelector = allColors.length > 1;
  const isSingleVariant = variants.length === 1;

  /* auto-select when only one option exists */
  useEffect(() => {
    if (isSingleVariant) {
      setSelectedSize(variants[0].size ?? null);
      setSelectedColor(variants[0].color ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSingleVariant]);

  useEffect(() => {
    if (allSizes.length === 1) setSelectedSize(allSizes[0]);
  }, [allSizes]);

  useEffect(() => {
    if (allColors.length === 1) setSelectedColor(allColors[0]);
  }, [allColors]);

  /* colors available for the currently selected size */
  const colorsForSelectedSize = selectedSize
    ? Array.from(
        new Set(
          variants
            .filter((v) => v.size === selectedSize && v.color !== null)
            .map((v) => v.color as string)
        )
      ).sort()
    : allColors;

  /* resolved variant */
  const selectedVariant =
    selectedSize !== null && selectedColor !== null
      ? variants.find(
          (v) => v.size === selectedSize && v.color === selectedColor
        ) ?? null
      : null;

  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, onVariantChange]);

  /* helpers */
  function isSizeFullyOos(size: string) {
    return variants
      .filter((v) => v.size === size)
      .every((v) => !v.in_stock);
  }

  function isColorOosForSize(color: string) {
    if (!selectedSize) return false;
    const v = variants.find((v) => v.size === selectedSize && v.color === color);
    return v ? !v.in_stock : false;
  }

  function getLowStockQty(color: string): number | null {
    if (!selectedSize) return null;
    const v = variants.find((v) => v.size === selectedSize && v.color === color);
    if (!v) return null;
    if (v.in_stock && v.stock_qty > 0 && v.stock_qty <= 3) return v.stock_qty;
    return null;
  }

  function handleSizeClick(size: string) {
    if (isSizeFullyOos(size)) return;
    setSelectedSize(size);
    // clear color if it doesn't exist for this new size
    if (
      selectedColor &&
      !variants.some((v) => v.size === size && v.color === selectedColor)
    ) {
      setSelectedColor(null);
    }
  }

  function handleColorClick(color: string) {
    setSelectedColor(color);
  }

  const canAddToCart =
    selectedVariant !== null && selectedVariant.in_stock;

  /* ── single-variant: simple display ──────────────────────────── */
  if (isSingleVariant) {
    const v = variants[0];
    return (
      <div className="mt-6 space-y-5">
        <ResolvedState variant={v} />
        <QuantityAndCart
          quantity={quantity}
          setQuantity={setQuantity}
          canAdd={v.in_stock}
          onAdd={() => onAddToCart(v, quantity)}
        />
      </div>
    );
  }

  /* ── multi-variant ────────────────────────────────────────────── */
  return (
    <div className="mt-6 space-y-6">
      {/* Size selector — buttons when 2+ sizes, static label when only 1 */}
      {showSizeSelector ? (
        <div>
          <p className="mb-3 font-sans text-sm font-medium text-[#1C1C1C]">
            Rug Size
            {selectedSize && (
              <span className="ml-1 font-medium">
                {" : "}
                {selectedSize}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {allSizes.map((size) => {
              const oos = isSizeFullyOos(size);
              const active = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSizeClick(size)}
                  disabled={oos}
                  className={`rounded px-3 py-1.5 font-sans text-sm transition-colors ${
                    active
                      ? "border-2 border-[#2D4A3E] bg-[#2D4A3E] font-medium text-white"
                      : oos
                      ? "cursor-not-allowed border border-gray-300 text-gray-400 line-through opacity-60"
                      : "cursor-pointer border border-[#1C1C1C] text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      ) : allSizes.length === 1 ? (
        <p className="font-sans text-sm font-medium text-[#1C1C1C]">
          Rug Size
          <span className="ml-1 font-medium">
            {" : "}
            {allSizes[0]}
          </span>
        </p>
      ) : null}

      {/* Color selector — buttons when 2+ colors, static label when only 1 */}
      {showColorSelector ? (
        <div>
          <p className="mb-3 font-sans text-sm font-medium text-[#1C1C1C]">
            Color
            {selectedColor && (
              <span className="ml-1 font-medium">
                {" : "}
                {selectedColor}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {colorsForSelectedSize.map((color) => {
              const oos = isColorOosForSize(color);
              const active = selectedColor === color;
              const lowStock = getLowStockQty(color);
              return (
                <div key={color} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleColorClick(color)}
                    className={`relative rounded px-3 py-1.5 font-sans text-xs transition-colors ${
                      active
                        ? "border-2 border-[#2D4A3E] bg-[#2D4A3E] font-medium text-white"
                        : oos
                        ? "cursor-not-allowed border border-[#1C1C1C] text-[#1C1C1C] opacity-50"
                        : "cursor-pointer border border-[#1C1C1C] text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
                    }`}
                  >
                    {color}
                    {oos && (
                      <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <line
                          x1="5"
                          y1="5"
                          x2="95"
                          y2="95"
                          stroke="#dc2626"
                          strokeWidth="2.5"
                        />
                      </svg>
                    )}
                  </button>
                  {lowStock !== null && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      {lowStock} left
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : allColors.length === 1 ? (
        <p className="font-sans text-sm font-medium text-[#1C1C1C]">
          Color
          <span className="ml-1 font-medium">
            {" : "}
            {allColors[0]}
          </span>
        </p>
      ) : null}

      {/* Resolved state — only show prompts when there are actually choices to make */}
      <div>
        {showSizeSelector && selectedSize === null ? (
          <p className="text-sm text-gray-400">
            Select a size to see available options
          </p>
        ) : showColorSelector && selectedColor === null ? (
          <p className="text-sm text-gray-400">
            Select a color to continue
          </p>
        ) : (
          <ResolvedState variant={selectedVariant} />
        )}
      </div>

      {/* Quantity + Add to Cart */}
      <QuantityAndCart
        quantity={quantity}
        setQuantity={setQuantity}
        canAdd={canAddToCart}
        onAdd={() => selectedVariant && onAddToCart(selectedVariant, quantity)}
      />
    </div>
  );
}

/* ── resolved state sub-component ────────────────────────────── */

function ResolvedState({ variant }: { variant: ProductVariant | null }) {
  if (!variant) return null;

  return (
    <div className="space-y-1">
      {variant.in_stock ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-2xl font-bold tabular-nums text-[#1C1C1C]">
              ${variant.price.toLocaleString()}
            </span>
            {variant.compare_at_price != null &&
              variant.compare_at_price > variant.price && (
                <span className="font-sans text-sm font-normal tabular-nums text-[#1C1C1C]/45 line-through">
                  ${variant.compare_at_price.toLocaleString()}
                </span>
              )}
          </div>
          {variant.stock_qty === 0 ? (
            <p className="text-sm font-medium text-green-700">In Stock</p>
          ) : variant.stock_qty <= 10 ? (
            <p className="text-sm font-medium text-amber-600">
              Only {variant.stock_qty} left!
            </p>
          ) : (
            <p className="text-sm font-medium text-green-700">In Stock</p>
          )}
        </>
      ) : (
        <>
          <span className="font-sans text-2xl font-bold tabular-nums text-gray-400">
            ${variant.price.toLocaleString()}
          </span>
          <p className="text-sm font-medium text-red-600">Out of Stock</p>
          <p className="text-xs text-gray-400">
            Select another size or color
          </p>
        </>
      )}
    </div>
  );
}

/* ── quantity + add-to-cart sub-component ─────────────────────── */

function QuantityAndCart({
  quantity,
  setQuantity,
  canAdd,
  onAdd,
}: {
  quantity: number;
  setQuantity: (q: number) => void;
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Quantity row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-[#1C1C1C] hover:border-[#2D4A3E] disabled:opacity-40"
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-medium text-[#1C1C1C]">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity(Math.min(10, quantity + 1))}
          className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-[#1C1C1C] hover:border-[#2D4A3E] disabled:opacity-40"
          disabled={quantity >= 10}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Add to Cart button */}
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={`flex w-full items-center justify-center gap-2 rounded py-3 font-sans text-sm font-semibold tracking-wide transition-colors ${
          canAdd
            ? "bg-[#2D4A3E] text-white hover:bg-[#3B5E4F]"
            : "cursor-not-allowed bg-gray-200 text-gray-400"
        }`}
      >
        <ShoppingCart className="h-4 w-4" />
        Add to Cart
      </button>
    </div>
  );
}
