"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductCardImage } from "@/components/ui/ProductCardImage";
import { formatPrice } from "@/lib/format-price";

type RecentItem = {
  id: string;
  name: string;
  slug: string;
  image?: string;
  manufacturer?: string;
  price: number;
};

export default function RecentlyViewedStrip() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ahf_recently_viewed");
      const parsed = raw ? (JSON.parse(raw) as RecentItem[]) : [];
      setItems(parsed.slice(0, 8));
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-[#1C1C1C]/10 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-charcoal">Recently viewed</h2>
      <p className="mt-1 text-sm text-warm-gray">Pick up where you left off.</p>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="w-44 shrink-0 rounded-lg border border-[#1C1C1C]/10 bg-[#FAF8F5] p-2 hover:border-[#2D4A3E]"
          >
            <div className="relative aspect-square overflow-hidden rounded-md bg-white">
              <ProductCardImage
                src={item.image}
                alt={item.name}
                manufacturer={item.manufacturer ?? ""}
                imageClassName="object-contain p-2"
                sizes="176px"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-charcoal">{item.name}</p>
            <p className="mt-1 text-sm font-semibold text-charcoal">{formatPrice(item.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
