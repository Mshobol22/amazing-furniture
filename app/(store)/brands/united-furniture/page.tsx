import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'
import { getManufacturerBySlug, getProductsByManufacturer } from '@/lib/supabase/products'

export const metadata = {
  title: 'United Furniture | Amazing Home Furniture Store',
  description: "Browse United Furniture's full lineup — motion sofas, recliners, bedroom collections, and more.",
}

export default async function UnitedFurniturePage() {
  const manufacturer = await getManufacturerBySlug('united-furniture')
  if (!manufacturer) notFound()

  const { total: initialProductCount } = await getProductsByManufacturer(manufacturer.name, undefined, 1, 0)

  return <BrandPageTemplate manufacturer={manufacturer} initialProductCount={initialProductCount} />
}
