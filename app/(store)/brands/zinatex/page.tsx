import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata: Metadata = {
  title: 'Zinatex Rugs | Amazing Home Furniture Store',
  description: "Discover Zinatex's premium rug collection — area rugs, runners, and accent pieces for every room.",
  alternates: {
    canonical: 'https://www.amazinghomefurniturestore.com/brands/zinatex',
  },
  openGraph: {
    title: 'Zinatex Rugs | Amazing Home Furniture Store',
    description:
      "Discover Zinatex's premium rug collection — area rugs, runners, and accent pieces for every room.",
    url: 'https://www.amazinghomefurniturestore.com/brands/zinatex',
    type: 'website',
  },
}

export default async function ZinatexPage() {
  const manufacturer = await getManufacturerBySlug('zinatex')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return (
    <Suspense fallback={null}>
      <BrandPageTemplate
        manufacturer={manufacturer}
        initialProductCount={initialProductCount}
        config={{
          step2Label: 'Style / Collection',
          step3Label: 'Color & Pattern',
          miscCategoryLabel: 'Other Items',
        }}
      />
    </Suspense>
  )
}
