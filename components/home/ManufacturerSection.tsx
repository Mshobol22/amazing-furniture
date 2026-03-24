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
                m.logo_url.startsWith("/api/image-proxy") ||
                (m.logo_url.startsWith("/") && !m.logo_url.startsWith("//")))
                ? m.logo_url
                : null;
            const localPublicLogo =
              !!safeLogo &&
              safeLogo.startsWith("/") &&
              !safeLogo.startsWith("/api/");
            const bg =
              m.backgroundImage &&
              (m.backgroundImage.startsWith("https://") ||
                m.backgroundImage.startsWith("/api/image-proxy"))
                ? m.backgroundImage
                : null;

            return (
              <Link
                key={m.slug}
                href={`/brands/${m.slug}`}
                className={isComing ? "pointer-events-none" : "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5E4F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1C1C1C]"}
                aria-label={`Shop ${m.name}`}
              >
                <div
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/10 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#2D4A3E] group-hover:shadow-[0_4px_20px_rgba(45,74,62,0.4)]"
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
                        className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/35"
                        aria-hidden
                      />
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 bg-[#1C1C1C]"
                      aria-hidden
                    />
                  )}

                  {safeLogo ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
                      <Image
                        src={safeLogo}
                        alt=""
                        width={200}
                        height={80}
                        className={
                          localPublicLogo
                            ? "h-12 w-auto max-w-[min(85%,220px)] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:h-14"
                            : "h-12 w-auto max-w-[min(85%,220px)] object-contain brightness-0 invert drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:h-14"
                        }
                      />
                    </div>
                  ) : (
                    <span className="sr-only">{m.name}</span>
                  )}

                  {isComing ? (
                    <span className="absolute right-2 top-2 z-20 rounded bg-white/20 px-2 py-1 text-xs text-white">
                      Coming Soon
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
