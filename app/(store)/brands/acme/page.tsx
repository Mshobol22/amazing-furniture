import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata = {
  title: 'ACME Furniture | Amazing Home Furniture Store',
  description: "Explore ACME's furniture collection — quality pieces with nationwide delivery.",
}

export default async function ACMEPage() {
  const manufacturer = await getManufacturerBySlug('acme')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return (
    <Suspense fallback={null}>
      <BrandPageTemplate manufacturer={manufacturer} initialProductCount={initialProductCount} />
    </Suspense>
  )
}
