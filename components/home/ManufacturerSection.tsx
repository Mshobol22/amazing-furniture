import Link from "next/link";

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

export default function ManufacturerSection({ manufacturers }: ManufacturerSectionProps) {
  return (
    <section className="bg-[#1C1C1C] px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="shrink-0 text-xs font-medium uppercase tracking-[0.15em] text-white/40 mr-2">
            Brands
          </span>
          {manufacturers.map((m) =>
            m.comingSoon ? (
              <span
                key={m.slug}
                className="shrink-0 rounded-full border border-white/10 px-4 py-1.5 text-sm font-medium text-white/30"
              >
                {m.name}
              </span>
            ) : (
              <Link
                key={m.slug}
                href={`/collections/all?manufacturer=${encodeURIComponent(m.name)}`}
                className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white/70 transition-colors hover:border-white/50 hover:text-white"
              >
                {m.name}
                {m.count != null && m.count > 0 && (
                  <span className="ml-1.5 text-xs text-white/40">
                    {m.count.toLocaleString()}
                  </span>
                )}
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
