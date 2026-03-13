import { getProducts } from "@/lib/supabase/products";
import { getCategoryDisplayName } from "@/lib/collection-utils";
import CollectionWithSort from "@/components/products/CollectionWithSort";
import type { Metadata } from "next";

const categoryMeta: Record<
  string,
  { title: string; description: string }
> = {
  all: {
    title: "All Furniture | Amazing Home Furniture",
    description:
      "Shop all 291 premium furniture pieces — sofas, beds, chairs, tables, cabinets and TV stands. Free shipping over $299.",
  },
  sofa: {
    title: "Sofas & Sectionals | Amazing Home Furniture",
    description:
      "Shop 55 premium sofas and sectionals. Modern, comfortable designs with free shipping over $299.",
  },
  bed: {
    title: "Beds & Bedroom Furniture | Amazing Home Furniture",
    description:
      "Shop 49 beds and bedroom furniture sets. Platform beds, upholstered frames, and more. Free shipping over $299.",
  },
  chair: {
    title: "Chairs & Recliners | Amazing Home Furniture",
    description:
      "Shop 25 chairs and recliners. Accent chairs, power recliners, and office chairs. Free shipping over $299.",
  },
  table: {
    title: "Dining Tables & Coffee Tables | Amazing Home Furniture",
    description:
      "Shop 100 dining tables and coffee tables. Modern and traditional styles. Free shipping over $299.",
  },
  cabinet: {
    title: "Cabinets & Storage | Amazing Home Furniture",
    description:
      "Shop 53 cabinets and storage solutions. Dressers, bookcases, and media cabinets. Free shipping over $299.",
  },
  "tv-stand": {
    title: "TV Stands & Entertainment Centers | Amazing Home Furniture",
    description:
      "Shop 9 TV stands and entertainment centers. Modern floating and floor-standing designs. Free shipping over $299.",
  },
};

interface CollectionPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { category } = await params;
  const meta =
    categoryMeta[category] ?? {
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

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { category } = await params;
  const products = await getProducts(category);
  const categoryLabel = getCategoryDisplayName(category);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Slim hero bar */}
      <div className="h-20 bg-[#1C1C1C] flex items-center justify-center">
        <h1 className="font-serif text-xl md:text-2xl font-semibold text-white">
          {categoryLabel}
        </h1>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="mb-8 text-sm text-warm-gray">
          {products.length} products
        </p>
        <CollectionWithSort products={products} />
      </div>
    </div>
  );
}
