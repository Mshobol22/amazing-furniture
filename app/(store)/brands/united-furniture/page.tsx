import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata: Metadata = {
  title: 'United Furniture | Amazing Home Furniture Store',
  description: "Browse United Furniture's full lineup — motion sofas, recliners, bedroom collections, and more.",
  alternates: {
    canonical: 'https://www.amazinghomefurniturestore.com/brands/united-furniture',
  },
  openGraph: {
    title: 'United Furniture | Amazing Home Furniture Store',
    description:
      "Browse United Furniture's full lineup — motion sofas, recliners, bedroom collections, and more.",
    url: 'https://www.amazinghomefurniturestore.com/brands/united-furniture',
    type: 'website',
  },
}

export default async function UnitedFurniturePage() {
  const manufacturer = await getManufacturerBySlug('united-furniture')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return (
    <Suspense fallback={null}>
      <BrandPageTemplate manufacturer={manufacturer} initialProductCount={initialProductCount} />
    </Suspense>
  )
}
