import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getManufacturerBySlug } from "@/lib/supabase/products";
import BrandPageTemplate from "@/components/brands/BrandPageTemplate";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const manufacturer = await getManufacturerBySlug(slug);
  if (!manufacturer) {
    return { title: "Brand Not Found | Amazing Home Furniture" };
  }

  return {
    title: `${manufacturer.name} Furniture | Amazing Home Furniture`,
    description: `Shop ${manufacturer.name} at Amazing Home Furniture. ${
      manufacturer.description ?? ""
    } Free shipping on orders over $299.`.trim(),
    alternates: {
      canonical: `https://amazinghomefurniturestore.com/brands/${manufacturer.slug}`,
    },
    openGraph: {
      title: `${manufacturer.name} Furniture | Amazing Home Furniture`,
      description: `Shop ${manufacturer.name} at Amazing Home Furniture. Free shipping on orders over $299.`,
      url: `https://amazinghomefurniturestore.com/brands/${manufacturer.slug}`,
      type: "website",
    },
  };
}

export default async function BrandPage({
  params,
}: BrandPageProps) {
  const { slug } = await params;

  const manufacturer = await getManufacturerBySlug(slug);
  if (!manufacturer) notFound();

  return (
    <Suspense fallback={null}>
      <BrandPageTemplate
        manufacturer={{
          name: manufacturer.name,
          slug: manufacturer.slug,
          description: manufacturer.description ?? "",
          logo_url: manufacturer.logo_url,
          heroTagline: undefined,
        }}
      />
    </Suspense>
  );
}
