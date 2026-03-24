import Image from "next/image";
import Link from "next/link";

const COMING_SOON = ["Artisan", "Interpraise"];

interface ManufacturerCard {
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  backgroundImage: string | null;
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
            const safeLogo =
              m.logo_url &&
              (m.logo_url.startsWith("https://") ||
                m.logo_url.startsWith("/api/image-proxy"))
                ? m.logo_url
                : null;
            const bg =
              m.backgroundImage &&
              (m.backgroundImage.startsWith("https://") ||
                m.backgroundImage.startsWith("/api/image-proxy"))
                ? m.backgroundImage
                : null;

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
                <div
                  className={`relative flex min-h-[180px] flex-col overflow-hidden rounded-lg border border-white/10 transition-all duration-200 hover:-translate-y-1 hover:border-[#2D4A3E] hover:shadow-[0_4px_20px_rgba(45,74,62,0.4)] ${bg ? "" : "bg-[#1C1C1C]"}`}
                  style={{ opacity: isComing ? 0.6 : 1 }}
                >
                  {bg ? (
                    <>
                      <Image
                        src={bg}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                        aria-hidden
                      />
                    </>
                  ) : null}

                  {safeLogo ? (
                    <div className="relative z-10 p-3">
                      <Image
                        src={safeLogo}
                        alt={`${m.name} logo`}
                        width={120}
                        height={32}
                        className="h-8 w-auto max-w-[140px] object-contain brightness-0 invert drop-shadow-md"
                      />
                    </div>
                  ) : null}

                  {isComing ? (
                    <span className="absolute right-2 top-2 z-10 rounded bg-white/20 px-2 py-1 text-xs text-white">
                      Coming Soon
                    </span>
                  ) : null}

                  <div className="relative z-10 mt-auto flex items-end justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {m.name}
                      </p>
                      <p className="text-sm text-white/70">{countLabel}</p>
                    </div>
                    {!isComing ? (
                      <span className="shrink-0 text-lg text-white" aria-hidden>
                        &rarr;
                      </span>
                    ) : null}
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
