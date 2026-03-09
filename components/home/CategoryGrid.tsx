"use client";

import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    name: "Bed",
    slug: "bed",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
  },
  {
    name: "Chair",
    slug: "chair",
    image:
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600",
  },
  {
    name: "Sofa",
    slug: "sofa",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
  },
  {
    name: "Table",
    slug: "table",
    image:
      "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600",
  },
  {
    name: "Cabinet",
    slug: "cabinet",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600",
  },
  {
    name: "TV Stands",
    slug: "tv-stand",
    image:
      "https://images.unsplash.com/photo-1542487354-feaf93476caa?w=600",
  },
] as const;

export default function CategoryGrid() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-12 text-center font-display text-3xl font-semibold text-charcoal">
          Shop By Category
        </h2>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/collections/${cat.slug}`}
              className="group relative shrink-0 overflow-hidden rounded-lg md:aspect-square"
            >
              <div className="aspect-square w-64 md:w-full">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute bottom-4 left-4 font-display text-xl font-semibold text-white">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
