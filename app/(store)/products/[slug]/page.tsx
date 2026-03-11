import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import {
  getProductBySlug,
  getProducts,
} from "@/lib/supabase/products";
import { ProductImage } from "@/components/ui/ProductImage";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
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
    <div className="px-4 py-12 sm:px-6 lg:px-8">
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

            {/* Star rating */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(product.rating)
                        ? "fill-walnut text-walnut"
                        : "text-light-sand"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-warm-gray">
                {product.rating} ({product.review_count} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-2xl font-semibold text-charcoal">
                ${product.price.toLocaleString()}
              </span>
              {product.compare_price != null &&
                product.compare_price > product.price && (
                  <span className="text-lg text-warm-gray line-through">
                    ${product.compare_price.toLocaleString()}
                  </span>
                )}
            </div>

            {/* In stock badge */}
            <div className="mt-4">
              {product.in_stock ? (
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
      </div>
    </div>
  );
}
