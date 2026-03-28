import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import {
  getProducts,
  resolveProductPageSlug,
} from "@/lib/supabase/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format-price";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import ProductVariantPageClient from "@/components/products/ProductVariantPageClient";
import ProductCard from "@/components/products/ProductCard";
import CategoryExploreReelTrigger from "@/components/reel/CategoryExploreReelTrigger";
import ProductDetailReelTrigger from "@/components/reel/ProductDetailReelTrigger";
import type { Metadata } from "next";
import type { ProductVariant } from "@/types";
import {
  getNationwideFDProductHeading,
  isNationwideFDProduct,
} from "@/lib/nfd-product-display";

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

function getCategoryBadgeLabel(category: string): string {
  const labels: Record<string, string> = {
    bed: "BED",
    "bedroom-furniture": "BEDROOM FURNITURE",
    sofa: "SOFA",
    chair: "CHAIR",
    table: "TABLE",
    cabinet: "CABINET",
    "tv-stand": "TV STAND",
    rug: "RUG",
    other: "OTHER",
  };

  return labels[category] ?? category.replace(/-/g, " ").toUpperCase();
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveProductPageSlug(slug);
  if (!resolved.ok) {
    return { title: "Product Not Found | Amazing Home Furniture" };
  }
  if (resolved.redirectToSlug) {
    redirect(`/products/${resolved.redirectToSlug}`);
  }
  const product = resolved.product;

  const enrichedTitle = isNationwideFDProduct(product)
    ? getNationwideFDProductHeading(product)
    : enrichProductTitle(product.name, product.category);

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
  const resolved = await resolveProductPageSlug(slug);
  if (!resolved.ok) {
    notFound();
  }
  if (resolved.redirectToSlug) {
    redirect(`/products/${resolved.redirectToSlug}`);
  }
  const product = resolved.product;

  // Fetch variants for products that support them (e.g. Zinatex rugs)
  let variants: ProductVariant[] = [];
  if (product.has_variants) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id)
      .order("sort_order", { ascending: true })
      .order("color", { ascending: true });
    variants = (data ?? []) as ProductVariant[];
  }

  const categoryProducts = await getProducts(product.category);
  const relatedProducts = categoryProducts
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  let collectionWishlistedIds: string[] = [];
  let siblingCollectionProducts: Array<{
    id: string;
    name: string;
    slug: string;
    images: string[] | null;
    price: number;
    sale_price: number | null;
    on_sale: boolean | null;
    piece_type: string | null;
  }> = [];

  const hasCollectionGroup = !!product.collection_group;
  const hasCollection = !!product.collection;
  const collectionValue = product.collection ?? null;

  if (hasCollectionGroup || hasCollection) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let siblingQuery = supabase
      .from("products")
      .select("id, name, slug, images, price, sale_price, on_sale, piece_type")
      .neq("id", product.id)
      .limit(6);

    if (hasCollectionGroup) {
      siblingQuery = siblingQuery
        .eq("collection_group", product.collection_group!)
        .or("images_validated.eq.true,and(images_validated.is.null,images.not.is.null)");
    } else {
      siblingQuery = siblingQuery
        .ilike("collection", collectionValue!)
        .not("images", "is", null);
    }

    const { data: siblingRows } = await siblingQuery;
    siblingCollectionProducts = (siblingRows ?? []) as typeof siblingCollectionProducts;

    if (user) {
      const siblingIds = siblingCollectionProducts.map((p) => p.id);
      const collectionIds = [product.id, ...siblingIds];
      const { data: wishlistedRows } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user.id)
        .in("product_id", collectionIds);

      collectionWishlistedIds = (wishlistedRows ?? []).map(
        (row) => row.product_id as string
      );
    }
  }

  const categoryLabel =
    product.category.charAt(0).toUpperCase() +
    product.category.slice(1).replace("-", " ");

  const detailReelLabel = product.is_collection_hero
    ? "Swipe to explore all pieces"
    : product.piece_type
      ? `Swipe to see the full ${product.piece_type} collection`
      : "Swipe to explore this collection";

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
        {product.has_variants && variants.length > 0 ? (
          <>
            {/* Variant products (e.g. Zinatex rugs) — client wrapper handles image sync */}
            <ProductVariantPageClient product={product} variants={variants} />
            {product.collection_group ? (
              <div className="mb-8">
                <ProductDetailReelTrigger
                  collectionGroup={product.collection_group}
                  category={product.category?.trim() ?? ""}
                  label={detailReelLabel}
                  initialWishlisted={collectionWishlistedIds}
                />
              </div>
            ) : (
              <div className="mb-8">
                <CategoryExploreReelTrigger
                  categorySlug={product.category}
                  categoryDisplayLabel={categoryLabel}
                  productId={product.id}
                />
              </div>
            )}
          </>
        ) : (
          /* Standard products — existing layout unchanged */
          <div className="mb-8 grid gap-6 lg:grid-cols-[55%_1fr]">
            {/* Image gallery */}
            <div className="space-y-3">
              <ProductImageGallery
                rawImages={product.images}
                productName={product.name}
                manufacturer={product.manufacturer}
                onSale={product.on_sale}
                salePrice={product.sale_price}
              />
              {product.collection_group ? (
                <ProductDetailReelTrigger
                  collectionGroup={product.collection_group}
                  category={product.category?.trim() ?? ""}
                  label={detailReelLabel}
                  initialWishlisted={collectionWishlistedIds}
                />
              ) : (
                <CategoryExploreReelTrigger
                  categorySlug={product.category}
                  categoryDisplayLabel={categoryLabel}
                  productId={product.id}
                />
              )}
            </div>

            {/* Product info */}
            <div>
              {isNationwideFDProduct(product) ? (
                <div className="mb-1 space-y-1">
                  <p className="font-sans text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {product.collection?.trim()
                      ? product.collection.trim()
                      : getCategoryBadgeLabel(product.category)}
                  </p>
                  <p className="font-sans text-xs font-semibold uppercase tracking-wide text-[#2D4A3E]">
                    Nationwide FD
                  </p>
                </div>
              ) : (
                <p className="font-sans text-sm font-semibold uppercase tracking-wide text-gray-500">
                  {getCategoryBadgeLabel(product.category)}
                </p>
              )}
              <h1 className="font-playfair text-2xl font-semibold leading-tight text-[#1C1C1C] md:text-3xl">
                {isNationwideFDProduct(product)
                  ? getNationwideFDProductHeading(product)
                  : product.name}
              </h1>

              {/* Price */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {product.on_sale && product.sale_price != null ? (
                  <>
                    <span className="font-sans text-2xl font-bold tabular-nums text-red-600">
                      {formatPrice(product.sale_price)}
                    </span>
                    <span className="font-sans text-sm font-normal tabular-nums text-[#1C1C1C]/45 line-through">
                      {formatPrice(product.price)}
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
                    <span className="font-sans text-2xl font-bold tabular-nums text-[#1C1C1C]">
                      {formatPrice(product.price)}
                    </span>
                    {product.compare_price != null &&
                      product.compare_price > product.price && (
                        <span className="font-sans text-sm font-normal tabular-nums text-[#1C1C1C]/45 line-through">
                          {formatPrice(product.compare_price)}
                        </span>
                      )}
                  </>
                )}
              </div>
              {product.on_sale && product.sale_price != null && (
                <p className="mt-1 text-sm font-medium text-green-700">
                  You save {formatPrice(product.price - product.sale_price)}
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
        )}

        {(hasCollectionGroup || hasCollection) &&
        siblingCollectionProducts.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 font-cormorant text-xl font-semibold text-[#1C1C1C] md:text-2xl">
              Also in this collection
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {siblingCollectionProducts
                .filter((sibling) => {
                  const first = sibling.images?.[0];
                  return Boolean(first && first.startsWith("https://"));
                })
                .map((sibling) => {
                  const imageSrc = sibling.images?.[0] as string;
                  return (
                    <Link
                      key={sibling.id}
                      href={`/products/${sibling.slug}`}
                      className="w-40 shrink-0 rounded-lg border border-[#1C1C1C]/15 bg-[#FAF8F5] p-2 transition-colors hover:border-[#2D4A3E] md:w-[200px]"
                    >
                      <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-md bg-white">
                        <Image
                          src={imageSrc}
                          alt={sibling.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 160px, 200px"
                        />
                      </div>
                      {sibling.piece_type ? (
                        <p className="text-xs font-medium text-[#1C1C1C]/70">
                          {sibling.piece_type}
                        </p>
                      ) : null}
                      <p className="line-clamp-2 text-sm font-medium text-[#1C1C1C]">
                        {sibling.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1C]">
                        {formatPrice(
                          sibling.on_sale && sibling.sale_price != null
                            ? sibling.sale_price
                            : sibling.price
                        )}
                      </p>
                    </Link>
                  );
                })}
            </div>
          </section>
        ) : null}

        {/* You May Also Like — horizontal scroll */}
        {relatedProducts.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 font-cormorant text-xl font-semibold text-charcoal md:text-2xl">
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
              name: isNationwideFDProduct(product)
                ? getNationwideFDProductHeading(product)
                : product.name,
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
