"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  { slug: "all", name: "All" },
  { slug: "sofa", name: "Sofas & Sectionals" },
  { slug: "bed", name: "Beds & Bedroom" },
  { slug: "chair", name: "Chairs & Recliners" },
  { slug: "cabinet", name: "Dressers & Cabinets" },
  { slug: "table", name: "Dining & Tables" },
  { slug: "tv-stand", name: "TV Stands & Entertainment" },
] as const;

export default function ShopAllFilterPills() {
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const sections = CATEGORIES.filter((c) => c.slug !== "all").map(
      (c) => document.getElementById(`section-${c.slug}`)
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("section-", "");
            setActiveCategory(id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (slug: string) => {
    setActiveCategory(slug);
    if (slug === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(`section-${slug}`);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 z-10 -mx-4 flex flex-wrap justify-center gap-2 bg-[#FAF8F5] px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => scrollToSection(cat.slug)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-walnut text-cream"
                : "border border-charcoal/20 bg-cream text-charcoal hover:border-charcoal/40"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
