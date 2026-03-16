"use client";

import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    name: "Sofas",
    slug: "sofa",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
  },
  {
    name: "Beds",
    slug: "bed",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
  },
  {
    name: "Chairs",
    slug: "chair",
    image:
      "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600",
  },
  {
    name: "Tables",
    slug: "table",
    image:
      "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600",
  },
  {
    name: "Cabinets",
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
  {
    name: "Rugs",
    slug: "rug",
    image:
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600",
  },
] as const;

export default function CategoryGrid() {
  return (
    <section className="bg-light-sand px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-forest/70">
            Collections
          </p>
          <h2 className="font-display text-3xl font-semibold text-charcoal sm:text-4xl">
            Shop by Category
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/collections/${cat.slug}`}
              className="group relative shrink-0 overflow-hidden rounded-xl w-36 sm:w-full"
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={400}
                  height={400}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-0 right-0 text-center font-display text-sm font-semibold text-white sm:text-base">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
