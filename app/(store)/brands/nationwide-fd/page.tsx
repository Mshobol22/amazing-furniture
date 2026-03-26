import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata = {
  title: 'Nationwide FD Furniture | Amazing Home Furniture Store',
  description: 'Shop the full Nationwide FD collection — bedroom sets, living room furniture, dining, and more.',
}

export default async function NationwideFDPage() {
  const manufacturer = await getManufacturerBySlug('nationwide-fd')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return (
    <BrandPageTemplate
      manufacturer={manufacturer}
      initialProductCount={initialProductCount}
      config={{
        step2Label: 'Collection',
        step3Label: 'Color & Material',
      }}
    />
  )
}
