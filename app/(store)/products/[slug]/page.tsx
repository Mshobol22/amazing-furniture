import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProductBySlug,
  getProducts,
} from "@/lib/supabase/products";
import { ProductImage } from "@/components/ui/ProductImage";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };
  return {
    title: product.name,
    description:
      product.description?.slice(0, 155) ??
      `${product.name} — Shop at Amazing Home Furniture`,
    openGraph: {
      title: `${product.name} | Amazing Home Furniture`,
      description: product.description?.slice(0, 155),
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
      url: `https://amazinghomefurniturestore.com/products/${slug}`,
    },
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/products/${slug}`,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categoryProducts = await getProducts(product.category);
  const relatedProducts = categoryProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const categoryLabel =
    product.category.charAt(0).toUpperCase() +
    product.category.slice(1).replace("-", " ");

  return (
    <div className="min-h-screen noise-overlay page-product px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/products?category=${product.category}`}
            className="hover:text-charcoal"
          >
            {categoryLabel}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-charcoal">{product.name}</span>
        </nav>

        {/* Main layout: 55% image, 45% info */}
        <div className="mb-16 grid gap-12 lg:grid-cols-[55%_1fr]">
          {/* Image gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-50 p-3">
              <ProductImage
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-contain"
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 border-transparent bg-gray-50 p-1 hover:border-walnut"
                  >
                    <ProductImage
                      src={img}
                      alt={`${product.name} ${i + 1}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div>
            <h1 className="font-display text-3xl font-semibold text-charcoal">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.on_sale && product.sale_price != null ? (
                <>
                  <span
                    className="text-2xl font-semibold"
                    style={{ color: "#DC2626" }}
                  >
                    ${product.sale_price.toLocaleString()}
                  </span>
                  <span className="text-lg text-warm-gray line-through">
                    ${product.price.toLocaleString()}
                  </span>
                  <span
                    className="rounded px-2 py-0.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: "#DC2626" }}
                  >
                    {Math.round(
                      (1 - product.sale_price / product.price) * 100
                    )}
                    % OFF
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-semibold text-charcoal">
                    ${product.price.toLocaleString()}
                  </span>
                  {product.compare_price != null &&
                    product.compare_price > product.price && (
                      <span className="text-lg text-warm-gray line-through">
                        ${product.compare_price.toLocaleString()}
                      </span>
                    )}
                </>
              )}
            </div>

            {/* In stock badge - default to In Stock unless explicitly out of stock */}
            <div className="mt-4">
              {product.in_stock !== false ? (
                <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  In Stock
                </span>
              ) : (
                <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-6 text-warm-gray">{product.description}</p>

            {/* Quantity + Add to Cart (client component) */}
            <ProductDetailClient product={product} />
          </div>
        </div>

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="mb-8 font-display text-2xl font-semibold text-charcoal">
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.description,
              sku: product.sku,
              image: product.images,
              offers: {
                "@type": "Offer",
                price: product.sale_price ?? product.price,
                priceCurrency: "USD",
                availability: product.in_stock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: `https://amazinghomefurniturestore.com/products/${product.slug}`,
                seller: {
                  "@type": "Organization",
                  name: "Amazing Home Furniture",
                },
              },
            }),
          }}
        />
      </div>
    </div>
  );
}
