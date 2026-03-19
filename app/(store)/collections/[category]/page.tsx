import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getInitialCollectionProducts,
  getCategoryManufacturerCounts,
  getCategoryCollections,
  getCategoryColors,
  getCategorySizes,
} from "@/lib/supabase/products";
import { getCategoryDisplayName } from "@/lib/collection-utils";
import CollectionClient from "@/components/collections/CollectionClient";

const ALLOWED_SLUGS = new Set([
  "bed",
  "sofa",
  "chair",
  "table",
  "cabinet",
  "tv-stand",
  "rug",
  "all",
]);

const categoryMeta: Record<string, { title: string; description: string }> = {
  all: {
    title: "All Furniture | Amazing Home Furniture",
    description:
      "Shop thousands of premium furniture pieces — sofas, beds, chairs, tables, cabinets, TV stands, and rugs. Free shipping over $299.",
  },
  sofa: {
    title: "Sofas & Sectionals | Amazing Home Furniture",
    description:
      "Shop premium sofas and sectionals. Modern, comfortable designs with free shipping over $299.",
  },
  bed: {
    title: "Beds & Bedroom Furniture | Amazing Home Furniture",
    description:
      "Shop beds and bedroom furniture sets. Platform beds, upholstered frames, and more. Free shipping over $299.",
  },
  chair: {
    title: "Chairs & Recliners | Amazing Home Furniture",
    description:
      "Shop chairs and recliners. Accent chairs, power recliners, and more. Free shipping over $299.",
  },
  table: {
    title: "Dining Tables & Coffee Tables | Amazing Home Furniture",
    description:
      "Shop dining tables and coffee tables. Modern and traditional styles. Free shipping over $299.",
  },
  cabinet: {
    title: "Cabinets & Storage | Amazing Home Furniture",
    description:
      "Shop cabinets and storage solutions. Dressers, bookcases, and media cabinets. Free shipping over $299.",
  },
  "tv-stand": {
    title: "TV Stands & Entertainment Centers | Amazing Home Furniture",
    description:
      "Shop TV stands and entertainment centers. Modern floating and floor-standing designs. Free shipping over $299.",
  },
  rug: {
    title: "Rugs & Floor Coverings | Amazing Home Furniture",
    description:
      "Shop luxury rugs and floor coverings by Zinatex. Area rugs, runners, and more. Free shipping over $299.",
  },
};

interface CollectionPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryMeta[category] ?? {
    title: `${category} Furniture | Amazing Home Furniture`,
    description: `Shop ${category} furniture with free shipping over $299.`,
  };
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/collections/${category}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `https://amazinghomefurniturestore.com/collections/${category}`,
      type: "website",
      images: [
        {
          url: "https://amazinghomefurniturestore.com/og-image.png?v=2",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { category } = await params;

  // Validate slug against allowed list — reject anything else
  if (!ALLOWED_SLUGS.has(category)) {
    notFound();
  }

  const isRug = category === "rug";

  const categoryLabel =
    category === "all"
      ? "All Products"
      : isRug
        ? "Rugs & Floor Coverings"
        : getCategoryDisplayName(category);

  // Fetch initial page + all filter option lists in parallel
  const [
    { products, total },
    manufacturerCounts,
    availableCollections,
    availableColors,
    availableSizes,
  ] = await Promise.all([
    getInitialCollectionProducts(category),
    getCategoryManufacturerCounts(category),
    isRug ? Promise.resolve([]) : getCategoryCollections(category),
    getCategoryColors(category),
    isRug ? getCategorySizes(category) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="flex h-20 items-center justify-center bg-[#1C1C1C]">
        <h1 className="font-display text-xl font-semibold text-white md:text-2xl">
          {categoryLabel}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="flex gap-6">
              <div className="hidden w-64 shrink-0 md:block" />
              <div className="h-96 flex-1 animate-pulse rounded-lg bg-gray-100" />
            </div>
          }
        >
          <CollectionClient
            slug={category}
            initialProducts={products}
            initialTotal={total}
            manufacturerCounts={manufacturerCounts}
            availableCollections={availableCollections}
            availableColors={availableColors}
            availableSizes={availableSizes}
          />
        </Suspense>
      </div>
    </div>
  );
}
