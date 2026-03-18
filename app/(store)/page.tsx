import type { Metadata } from "next";
import TrustSignalStrip from "@/components/home/TrustSignalStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import PromoBanner from "@/components/home/PromoBanner";
import FinancingSection from "@/components/home/FinancingSection";
import HeroSlideshow from "@/components/home/HeroSlideshow";
import ManufacturerSection from "@/components/home/ManufacturerSection";
import RugsSpotlight from "@/components/home/RugsSpotlight";
import SaleSection from "@/components/home/SaleSection";
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
      <HeroSlideshow slides={slides} />
      <ManufacturerSection manufacturers={manufacturers} />
      <CategoryGrid categoryImages={categoryImages} />
      <SaleSection products={saleProducts} />
      <TrustSignalStrip />
      <FinancingSection />
      <RugsSpotlight products={rugProducts} />
      <PromoBanner />
    </div>
  );
}
