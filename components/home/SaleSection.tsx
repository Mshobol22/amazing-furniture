import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format-price";
import { getStorefrontListPrice } from "@/lib/zinatex-product-display";
import { ProductCardImage } from "@/components/ui/ProductCardImage";

interface SaleSectionProps {
  products: Product[];
}

function getValidImage(images: string[]): string | null {
  for (const img of images) {
    if (typeof img === "string" && img.startsWith("http")) return img;
  }
  return null;
}

export default function SaleSection({ products }: SaleSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="w-full bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded bg-[#2D4A3E]" />
            <h2 className="font-cormorant text-3xl font-semibold tracking-wide text-[#2D4A3E] md:text-4xl">
              On Sale Now
            </h2>
          </div>
          <Link
            href="/collections/sale"
            className="flex items-center gap-1 text-sm font-medium text-[#2D4A3E] transition-colors hover:text-[#1E3329]"
          >
            View All Sale Items
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {products.map((product) => {
            const img = getValidImage(product.images);
            const list = getStorefrontListPrice(product);
            const regular = product.price;
            const savings =
              product.sale_price != null && regular > 0
                ? Math.round((regular - product.sale_price) * 100) / 100
                : 0;

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block w-60 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                  <ProductCardImage
                    src={img}
                    alt={product.name}
                    manufacturer={product.manufacturer}
                    imageClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                    cardClassName="bg-[#2D4A3E]/10"
                    sizes="240px"
                  />
                  <span className="absolute left-2 top-2 z-10 rounded bg-[#2D4A3E] px-2 py-1 text-xs font-bold text-white">
                    SALE
                  </span>
                  {savings > 0 && (
                    <span className="absolute right-2 top-2 z-10 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      Save {formatPrice(savings)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 py-2">
                  <p className="truncate text-sm text-[#1C1C1C]">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 line-through">
                    {formatPrice(
                      product.sale_price != null ? product.price : list
                    )}
                  </p>
                  <p className="text-lg font-bold text-[#2D4A3E]">
                    {product.sale_price != null ? formatPrice(product.sale_price) : null}
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
