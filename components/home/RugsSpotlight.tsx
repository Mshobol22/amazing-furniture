import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { formatPrice } from "@/lib/format-price";

interface SpotlightProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  manufacturer?: string | null;
}

interface RugsSpotlightProps {
  products: SpotlightProduct[];
}

export default function RugsSpotlight({ products }: RugsSpotlightProps) {
  if (!products.length) return null;

  return (
    <section className="on-forest-surface bg-forest px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-cream/60">
              Zinatex Collection
            </p>
            <h2 className="font-cormorant text-3xl font-semibold tracking-wide text-cream md:text-4xl">
              Premium Rugs by Zinatex
            </h2>
            <p className="mt-3 max-w-md font-cormorant text-lg font-normal italic text-[#FAF8F5]/75">
              Handwoven area rugs that bring warmth, texture, and character to
              every room.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="shrink-0 border-cream/40 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
          >
            <Link href="/collections/rug" className="flex items-center gap-2">
              Shop All Rugs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {products.slice(0, 4).map((product) => {
            const raw =
              product.images?.[0] &&
              product.images[0] !== "/images/placeholder-product.jpg"
                ? product.images[0]
                : null;
            const img = productLeadImageSrc(product.manufacturer, raw);

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-xl bg-forest-light"
              >
                <div className="relative aspect-square overflow-hidden">
                  {img ? (
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-forest-dark/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-medium text-cream/90 group-hover:text-cream transition-colors">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-cream">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
