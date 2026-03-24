import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'

export const metadata = {
  title: 'United Furniture | Amazing Home Furniture Store',
  description: "Browse United Furniture's full lineup — motion sofas, recliners, bedroom collections, and more.",
}

export default async function UnitedFurniturePage() {
  const supabase = await createClient()
  const { data: manufacturer } = await supabase
    .from('manufacturers')
    .select('*')
    .eq('slug', 'united-furniture')
    .single()

  if (!manufacturer) notFound()

  return <BrandPageTemplate manufacturer={manufacturer} />
}
