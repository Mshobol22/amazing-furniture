import type { Metadata } from "next";
import TrustSignalStrip from "@/components/home/TrustSignalStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PromoBanner from "@/components/home/PromoBanner";
import HeroSlideshow from "@/components/home/HeroSlideshow";
import ManufacturerSection from "@/components/home/ManufacturerSection";
import RugsSpotlight from "@/components/home/RugsSpotlight";
import {
  getFeaturedProducts,
  getHeroSlides,
  getManufacturersWithCounts,
  getRugsSpotlight,
} from "@/lib/supabase/products";

export const metadata: Metadata = {
  title: "Amazing Home Furniture — Premium Furniture for Every Room",
  description:
    "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. 2-year manufacturer warranty.",
  alternates: {
    canonical: "https://amazinghomefurniturestore.com",
  },
  openGraph: {
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. 2-year manufacturer warranty.",
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
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. 2-year manufacturer warranty.",
    images: ["https://amazinghomefurniturestore.com/og-image.png?v=2"],
  },
};

export default async function StorePage() {
  const [slides, manufacturers, rugProducts, featuredProducts] =
    await Promise.all([
      getHeroSlides(),
      getManufacturersWithCounts(),
      getRugsSpotlight(),
      getFeaturedProducts(),
    ]);

  return (
    <div className="min-h-screen bg-cream">
      <HeroSlideshow slides={slides} />
      <TrustSignalStrip />
      <ManufacturerSection manufacturers={manufacturers} />
      <CategoryGrid />
      <RugsSpotlight products={rugProducts} />
      <FeaturedProducts products={featuredProducts} />
      <PromoBanner />
    </div>
  );
}
