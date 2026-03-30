import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata: Metadata = {
  title: 'Nationwide FD Furniture | Amazing Home Furniture Store',
  description: 'Shop the full Nationwide FD collection — bedroom sets, living room furniture, dining, and more.',
  alternates: {
    canonical: 'https://www.amazinghomefurniturestore.com/brands/nationwide-fd',
  },
  openGraph: {
    title: 'Nationwide FD Furniture | Amazing Home Furniture Store',
    description:
      'Shop the full Nationwide FD collection — bedroom sets, living room furniture, dining, and more.',
    url: 'https://www.amazinghomefurniturestore.com/brands/nationwide-fd',
    type: 'website',
  },
}

export default async function NationwideFDPage() {
  const manufacturer = await getManufacturerBySlug('nationwide-fd')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return (
    <Suspense fallback={null}>
      <BrandPageTemplate
        manufacturer={manufacturer}
        initialProductCount={initialProductCount}
        config={{
          step2Label: 'Collection',
          step3Label: 'Color & Material',
        }}
      />
    </Suspense>
  )
}
