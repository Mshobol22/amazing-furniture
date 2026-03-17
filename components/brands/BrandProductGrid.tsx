"use client";

import { useState, useMemo } from "react";
import ProductGrid from "@/components/products/ProductGrid";
import type { Product } from "@/types";

interface BrandProductGridProps {
  products: Product[];
  categories: string[];
  totalCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  sofa: "Sofas",
  bed: "Beds",
  chair: "Chairs",
  table: "Tables",
  cabinet: "Cabinets",
  "tv-stand": "TV Stands",
  rug: "Rugs",
};

export default function BrandProductGrid({
  products,
  categories,
  totalCount,
}: BrandProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div>
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-[#2D4A3E] text-[#FAF8F5]"
                : "border border-[#1C1C1C] bg-transparent text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
            }`}
          >
            All ({totalCount})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#2D4A3E] text-[#FAF8F5]"
                  : "border border-[#1C1C1C] bg-transparent text-[#1C1C1C] hover:border-[#2D4A3E] hover:text-[#2D4A3E]"
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
      )}
      <ProductGrid products={filtered} />
    </div>
  );
}
