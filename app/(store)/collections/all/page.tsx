import type { Metadata } from "next";
import ShopAllFurnitureClient from "@/components/collections/ShopAllFurnitureClient";

export const metadata: Metadata = {
  title: "Shop All Furniture",
  description:
    "Shop premium furniture across sofas, beds, chairs, cabinets, tables, TV stands, and rugs. Free shipping over $299.",
  openGraph: {
    title: "Shop All Furniture | Amazing Home Furniture",
    url: "https://amazinghomefurniturestore.com/collections/all",
  },
  alternates: {
    canonical: "https://amazinghomefurniturestore.com/collections/all",
  },
};

export default function ShopAllPage() {
  return <ShopAllFurnitureClient />;
}
