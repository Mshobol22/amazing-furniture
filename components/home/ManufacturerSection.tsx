import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ManufacturerCard {
  name: string;
  slug: string;
  description: string;
  count: number | null;
  comingSoon?: boolean;
}

interface ManufacturerSectionProps {
  manufacturers: ManufacturerCard[];
}

export default function ManufacturerSection({
  manufacturers,
}: ManufacturerSectionProps) {
  return (
    <section className="bg-cream px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-forest/70">
            Our Brands
          </p>
          <h2 className="font-display text-3xl font-semibold text-charcoal sm:text-4xl">
            Shop by Manufacturer
          </h2>
          <p className="mt-3 text-warm-gray">
            Curated collections from industry-leading furniture brands
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {manufacturers.map((m) => (
            <div key={m.slug}>
              {m.comingSoon ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-light-sand bg-light-sand/50 px-4 py-8 text-center opacity-60">
                  <span className="font-display text-base font-semibold text-charcoal">
                    {m.name}
                  </span>
                  <span className="mt-1 text-xs text-warm-gray">
                    Coming Soon
                  </span>
                </div>
              ) : (
                <Link
                  href={`/collections/all?manufacturer=${encodeURIComponent(m.name)}`}
                  className="group flex h-full flex-col items-center justify-center rounded-xl border border-light-sand bg-white px-4 py-8 text-center shadow-sm transition-all hover:border-forest/30 hover:shadow-md"
                >
                  <span className="font-display text-base font-semibold text-charcoal group-hover:text-forest transition-colors">
                    {m.name}
                  </span>
                  {m.count != null && (
                    <span className="mt-1 text-xs text-warm-gray">
                      {m.count.toLocaleString()} products
                    </span>
                  )}
                  <span className="mt-3 flex items-center gap-1 text-xs font-medium text-forest opacity-0 transition-opacity group-hover:opacity-100">
                    Browse <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
