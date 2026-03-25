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
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <section className="bg-[#FAF8F5] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center font-cormorant text-3xl font-semibold tracking-wide text-[#2D4A3E] md:text-4xl">
          Shop by Brand
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {manufacturers.filter((m) => m.is_active && Number(m.count ?? 0) > 0).map((m) => {
            const isComing =
              m.comingSoon || COMING_SOON.includes(m.name);
            const safeLogo =
              m.logo_url &&
              (m.logo_url.startsWith("https://") ||
                m.logo_url.startsWith("/api/image-proxy") ||
                (m.logo_url.startsWith("/") && !m.logo_url.startsWith("//")))
                ? m.logo_url
                : null;

            return (
              <Link
                key={m.slug}
                href={`/brands/${m.slug}`}
                className={
                  isComing
                    ? "pointer-events-none"
                    : "group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B5E4F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F5]"
                }
                aria-label={`Shop ${m.name}`}
              >
                <div
                  className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                  style={{ opacity: isComing ? 0.6 : 1 }}
                >
                  <div
                    className={
                      m.slug === "zinatex"
                        ? "relative h-full w-full min-h-0 rounded-md bg-[#1C1C1C] p-3"
                        : "relative h-full w-full min-h-0"
                    }
                  >
                    {safeLogo ? (
                      <Image
                        src={safeLogo}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 240px"
                        className="object-contain object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-[#2D4A3E]">
                        <span className="text-2xl font-semibold tracking-wide text-white">
                          {getInitials(m.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {isComing ? (
                    <span className="absolute right-2 top-2 z-10 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-[#1C1C1C]">
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
