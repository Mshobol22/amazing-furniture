import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'

export const metadata = {
  title: 'Nationwide FD Furniture | Amazing Home Furniture Store',
  description: 'Shop the full Nationwide FD collection — bedroom sets, living room furniture, dining, and more.',
}

export default async function NationwideFDPage() {
  const supabase = await createClient()
  const { data: manufacturer } = await supabase
    .from('manufacturers')
    .select('*')
    .eq('slug', 'nationwide-fd')
    .single()

  if (!manufacturer) notFound()

  return (
    <BrandPageTemplate
      manufacturer={manufacturer}
      config={{
        step2Label: 'Collection',
        step3Label: 'Color & Material',
      }}
    />
  )
}
