import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'

export const metadata = {
  title: 'Zinatex Rugs | Amazing Home Furniture Store',
  description: "Discover Zinatex's premium rug collection — area rugs, runners, and accent pieces for every room.",
}

export default async function ZinatexPage() {
  const supabase = await createClient()
  const { data: manufacturer } = await supabase
    .from('manufacturers')
    .select('*')
    .eq('slug', 'zinatex')
    .single()

  if (!manufacturer) notFound()

  return (
    <BrandPageTemplate
      manufacturer={manufacturer}
      config={{
        defaultCategory: 'Rugs',
        step2Label: 'Style / Collection',
        step3Label: 'Color & Pattern',
        miscCategoryLabel: 'Other Items',
      }}
    />
  )
}
