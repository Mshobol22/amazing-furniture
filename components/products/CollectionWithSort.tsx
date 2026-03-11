"use client";

import { useState, useMemo } from "react";
import ProductGrid from "./ProductGrid";
import type { Product } from "@/types";

type SortOption = "price-asc" | "price-desc" | "name-asc";

interface CollectionWithSortProps {
  products: Product[];
}

export default function CollectionWithSort({ products }: CollectionWithSortProps) {
  const [sort, setSort] = useState<SortOption>("price-asc");

  const sortedProducts = useMemo(() => {
    const arr = [...products];
    switch (sort) {
      case "price-asc":
        return arr.sort((a, b) => a.price - b.price);
      case "price-desc":
        return arr.sort((a, b) => b.price - a.price);
      case "name-asc":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return arr;
    }
  }, [products, sort]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-warm-gray">Sort:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-walnut/50"
        >
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A-Z</option>
        </select>
      </div>
      <ProductGrid products={sortedProducts} />
    </div>
  );
}
