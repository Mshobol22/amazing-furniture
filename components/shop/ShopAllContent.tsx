"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductGrid from "@/components/products/ProductGrid";
import type { Product } from "@/types";

const CATEGORY_PILLS = [
  { slug: "all", name: "All" },
  { slug: "sofa", name: "Sofas" },
  { slug: "bed", name: "Beds" },
  { slug: "chair", name: "Chairs" },
  { slug: "cabinet", name: "Cabinets" },
  { slug: "table", name: "Tables" },
  { slug: "tv-stand", name: "TV Stands" },
  { slug: "rug", name: "Rugs" },
] as const;

interface ShopAllContentProps {
  products: Product[];
  initialManufacturer?: string | null;
  manufacturers?: string[];
}

export default function ShopAllContent({
  products,
  initialManufacturer,
  manufacturers = [],
}: ShopAllContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeManufacturer, setActiveManufacturer] = useState<string>(
    initialManufacturer ?? "all"
  );

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (activeManufacturer !== "all") {
      result = result.filter((p) => p.manufacturer === activeManufacturer);
    }
    return result;
  }, [products, activeCategory, activeManufacturer]);

  const handleManufacturerClick = (mfr: string) => {
    const next = mfr === activeManufacturer ? "all" : mfr;
    setActiveManufacturer(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("manufacturer");
    } else {
      params.set("manufacturer", next);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div>
      {/* Category pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_PILLS.map((cat) => {
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#2D4A3E] text-[#FAF8F5]"
                  : "border border-[#1C1C1C] bg-transparent text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Manufacturer pills */}
      {manufacturers.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {manufacturers.map((mfr) => {
            const isActive = activeManufacturer === mfr;
            return (
              <button
                key={mfr}
                type="button"
                onClick={() => handleManufacturerClick(mfr)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#1C1C1C] text-white"
                    : "border border-gray-300 bg-transparent text-gray-600 hover:border-[#1C1C1C] hover:text-[#1C1C1C]"
                }`}
              >
                {mfr}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter chip */}
      {activeManufacturer !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-warm-gray">Filtering by:</span>
          <button
            type="button"
            onClick={() => handleManufacturerClick(activeManufacturer)}
            className="flex items-center gap-1.5 rounded-full bg-[#1C1C1C] px-3 py-1 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          >
            Brand: {activeManufacturer}
            <span className="ml-0.5 text-white/60">×</span>
          </button>
          <span className="text-xs text-warm-gray">
            {filteredProducts.length} products
          </span>
        </div>
      )}

      <ProductGrid products={filteredProducts} />
    </div>
  );
}
