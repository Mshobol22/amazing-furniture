import type { Metadata } from "next";
import HeroBanner from "@/components/home/HeroBanner";
import TrustSignalStrip from "@/components/home/TrustSignalStrip";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import PromoBanner from "@/components/home/PromoBanner";
import LifestyleSplit from "@/components/home/LifestyleSplit";
import { getFeaturedProducts } from "@/lib/supabase/products";

export const metadata: Metadata = {
  title: "Amazing Home Furniture — Premium Furniture for Every Room",
  description:
    "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Easy 30-day returns.",
  alternates: {
    canonical: "https://amazinghomefurniturestore.com",
  },
  openGraph: {
    title: "Amazing Home Furniture — Premium Furniture for Every Room",
    description:
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Easy 30-day returns.",
    url: "https://amazinghomefurniturestore.com",
    siteName: "Amazing Home Furniture",
    type: "website",
    images: [
      {
        url: "https://amazinghomefurniturestore.com/og-image.png",
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
      "Shop premium sofas, beds, chairs, tables, cabinets and TV stands. Free shipping on orders over $299. Easy 30-day returns.",
    images: ["https://amazinghomefurniturestore.com/og-image.png"],
  },
};

export default async function StorePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <HeroBanner />
      <TrustSignalStrip />
      <CategoryGrid />
      <FeaturedProducts products={products} />
      <PromoBanner />
      <LifestyleSplit />
    </div>
  );
}
