import Image from "next/image";
import Link from "next/link";

const CATEGORY_META = [
  { name: "Sofas", slug: "sofa" },
  { name: "Beds", slug: "bed" },
  { name: "Chairs", slug: "chair" },
  { name: "Tables", slug: "table" },
  { name: "Cabinets", slug: "cabinet" },
  { name: "TV Stands", slug: "tv-stand" },
  { name: "Rugs", slug: "rug" },
] as const;

interface CategoryGridProps {
  categoryImages: Record<string, string | null>;
}

export default function CategoryGrid({ categoryImages }: CategoryGridProps) {
  return (
    <section className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-0">
        {CATEGORY_META.map((cat) => {
          const raw = categoryImages[cat.slug] ?? null;
          const img = raw?.startsWith("https://") ? raw : null;
          return (
            <Link
              key={cat.slug}
              href={`/collections/${cat.slug}`}
              className="group relative overflow-hidden aspect-square"
            >
              {img ? (
                <Image
                  src={img}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 14vw"
                />
              ) : (
                <div className="h-full w-full bg-[#2D4A3E]/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute bottom-3 left-0 right-0 text-center font-display text-sm font-semibold text-white drop-shadow sm:text-base">
                {cat.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
