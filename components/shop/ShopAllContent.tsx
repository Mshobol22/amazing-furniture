"use client";

import { useState, useMemo } from "react";
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
] as const;

interface ShopAllContentProps {
  products: Product[];
}

export default function ShopAllContent({ products }: ShopAllContentProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORY_PILLS.map((cat) => {
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#8B6914] text-[#FAF8F5]"
                  : "border border-[#1C1C1C] bg-transparent text-[#1C1C1C] hover:border-[#8B6914] hover:text-[#8B6914]"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
      <ProductGrid products={filteredProducts} />
    </div>
  );
}
