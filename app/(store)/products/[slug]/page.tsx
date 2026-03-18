import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  getProductBySlug,
  getProducts,
} from "@/lib/supabase/products";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import ProductCard from "@/components/products/ProductCard";
import type { Metadata } from "next";

function enrichProductTitle(name: string, category: string): string {
  const categoryKeywords: Record<string, string> = {
    sofa: "Sofa",
    bed: "Bed Frame",
    chair: "Chair",
    table: "Dining Table",
    cabinet: "Cabinet",
    "tv-stand": "TV Stand",
  };
  const keyword = categoryKeywords[category] ?? "";
  if (keyword && !name.toLowerCase().includes(keyword.toLowerCase())) {
    return `${name} ${keyword}`;
  }
  return name;
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product)
    return { title: "Product Not Found | Amazing Home Furniture" };

  const enrichedTitle = enrichProductTitle(product.name, product.category);

  return {
    title: `${enrichedTitle} | Amazing Home Furniture`,
    description: product.description
      ? `${product.description.slice(0, 150)}. Shop ${product.category} furniture with free shipping over $299.`
      : `Shop ${product.category} furniture with free shipping over $299.`,
    openGraph: {
      title: `${enrichedTitle} | Amazing Home Furniture`,
      description: product.description?.slice(0, 150) ?? "",
      images: product.images?.[0]
        ? [{ url: product.images[0], width: 800, height: 600 }]
        : [],
      url: `https://amazinghomefurniturestore.com/products/${product.slug}`,
      type: "website",
    },
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/products/${product.slug}`,
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
    <div className="min-h-screen bg-[#FAF8F5] px-4 pt-4 pb-20 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1.5 text-xs text-warm-gray">
          <Link href="/" className="hover:text-charcoal">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            href={`/collections/${product.category}`}
            className="hover:text-charcoal"
          >
            {categoryLabel}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-charcoal">{product.name}</span>
        </nav>

        {/* Main layout: 55% image, 45% info */}
        <div className="mb-8 grid gap-6 lg:grid-cols-[55%_1fr]">
          {/* Image gallery */}
          <ProductImageGallery
            rawImages={product.images}
            productName={product.name}
            onSale={product.on_sale}
            salePrice={product.sale_price}
          />

          {/* Product info */}
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1C1C1C]">
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
            {product.on_sale && product.sale_price != null && (
              <p className="mt-1 text-sm font-medium text-green-700">
                You save ${(product.price - product.sale_price).toFixed(2)}
              </p>
            )}

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

            {/* Quantity + Add to Cart + collapsible description (client) */}
            <ProductDetailClient product={product} />
          </div>
        </div>

        {/* You May Also Like — horizontal scroll */}
        {relatedProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-base font-semibold text-charcoal">
              You May Also Like
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {relatedProducts.map((p) => (
                <div key={p.id} className="w-52 shrink-0">
                  <ProductCard product={p} />
                </div>
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
