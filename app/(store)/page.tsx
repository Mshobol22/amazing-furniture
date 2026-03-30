import type { Metadata } from "next";
import Link from "next/link";
import TrustSignalStrip from "@/components/home/TrustSignalStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import PromoBanner from "@/components/home/PromoBanner";
import FinancingSection from "@/components/home/FinancingSection";
import HeroSlideshow from "@/components/home/HeroSlideshow";
import ManufacturerSection from "@/components/home/ManufacturerSection";
import RugsSpotlight from "@/components/home/RugsSpotlight";
import SaleSection from "@/components/home/SaleSection";
import SaleEventBlock from "@/components/home/SaleEventBlock";
import {
  getHeroSlides,
  getManufacturersWithCounts,
  getRugsSpotlight,
  getCategoryImages,
  getSaleProducts,
} from "@/lib/supabase/products";

export const metadata: Metadata = {
  title: "Amazing Home Furniture — Premium Furniture for Every Room",
  description:
    "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
  alternates: {
    canonical: "https://amazinghomefurniturestore.com",
  },
  openGraph: {
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
    url: "https://amazinghomefurniturestore.com",
    siteName: "Amazing Home Furniture",
    type: "website",
    images: [
      {
        url: "https://amazinghomefurniturestore.com/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "Amazing Home Furniture — Premium Furniture for Every Room",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Flexible financing available.",
    images: ["https://amazinghomefurniturestore.com/og-image.png?v=2"],
  },
};

export default async function StorePage() {
  const [slides, manufacturers, rugProducts, categoryImagesList, saleProducts] =
    await Promise.all([
      getHeroSlides(),
      getManufacturersWithCounts(),
      getRugsSpotlight(),
      getCategoryImages(),
      getSaleProducts(8),
    ]);

  const categoryImages = Object.fromEntries(
    categoryImagesList.map(({ slug, image }) => [slug, image])
  );

  return (
    <div className="min-h-screen bg-cream">
      <section className="border-b border-[#2D4A3E]/20 bg-[#FAF8F5]">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center">
          <Link
            href="/financing"
            className="font-sans text-sm font-semibold text-[#2D4A3E] underline-offset-4 hover:underline"
          >
            Flexible Financing Available - Apply with Koalafi or Synchrony
          </Link>
        </div>
      </section>
      <HeroSlideshow slides={slides} />
      <ManufacturerSection manufacturers={manufacturers} />
      <SaleEventBlock />
      <CategoryGrid categoryImages={categoryImages} />
      <SaleSection products={saleProducts} />
      <TrustSignalStrip />
      <FinancingSection />
      <RugsSpotlight products={rugProducts} />
      <PromoBanner />
    </div>
  );
}
