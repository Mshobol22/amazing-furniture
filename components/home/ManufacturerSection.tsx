import Image from "next/image";
import Link from "next/link";

const COMING_SOON = ["Artisan", "Interpraise"];

interface ManufacturerCard {
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  count: number | null;
  is_active?: boolean;
  comingSoon?: boolean;
}

interface ManufacturerSectionProps {
  manufacturers: ManufacturerCard[];
}

export default function ManufacturerSection({
  manufacturers,
}: ManufacturerSectionProps) {
  return (
    <section className="bg-[#1C1C1C] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center font-display text-2xl font-semibold text-white">
          Shop by Brand
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manufacturers.filter(m => m.is_active && (m.count ?? 0) > 0).map((m) => {
            const isComing =
              m.comingSoon || COMING_SOON.includes(m.name);
            const cardBgClass =
              m.slug === "nationwide-fd" ? "bg-[#1C1C1C]" : "bg-[#FAF8F5]";
            const infoBgClass =
              m.slug === "nationwide-fd" ? "bg-[#1C1C1C]" : "bg-[#FAF8F5]";
            const nameClass =
              m.slug === "nationwide-fd" ? "text-[#FAF8F5]" : "text-[#1C1C1C]";
            const labelClass =
              m.slug === "nationwide-fd" ? "text-[#FAF8F5]/70" : "text-[#1C1C1C]/60";
            const validLogo = m.logo_url ? m.logo_url : null;

            const countLabel =
              isComing
                ? "Coming soon"
                : m.count != null && m.count > 0
                  ? `${m.count.toLocaleString()} products`
                  : "Catalog loading...";

            return (
              <Link
                key={m.slug}
                href={`/brands/${m.slug}`}
                className={isComing ? "pointer-events-none" : ""}
              >
                <div className="relative flex min-h-[180px] flex-col overflow-hidden rounded-lg border border-white/10 transition-all duration-200 hover:-translate-y-1 hover:border-[#2D4A3E] hover:shadow-[0_4px_20px_rgba(45,74,62,0.4)]">
                  {/* Logo area */}
                  <div
                    className={`relative flex min-h-[130px] flex-1 items-center justify-center p-6 ${cardBgClass}`}
                    style={{ opacity: isComing ? 0.6 : 1 }}
                  >
                    {validLogo ? (
                      <Image
                        src={validLogo}
                        alt={m.name}
                        width={220}
                        height={80}
                        className="max-h-[80px] w-auto object-contain"
                      />
                    ) : (
                      <span className="text-center text-xl font-bold leading-tight text-[#1C1C1C]">
                        {m.name}
                      </span>
                    )}
                    {isComing && (
                      <span className="absolute right-2 top-2 rounded bg-white/20 px-2 py-1 text-xs text-white">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  {/* Info area */}
                  <div className={`flex items-center justify-between px-4 py-3 ${infoBgClass}`}>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${nameClass}`}>
                        {m.name}
                      </p>
                      <p className={`text-xs ${labelClass}`}>
                        {countLabel}
                      </p>
                    </div>
                    {!isComing && (
                      <span className="text-lg text-[#2D4A3E]">&rarr;</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
