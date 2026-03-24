import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BrandPageTemplate from '@/components/brands/BrandPageTemplate'

export const metadata = {
  title: 'ACME Furniture | Amazing Home Furniture Store',
  description: "Explore ACME's furniture collection — quality pieces with nationwide delivery.",
}

export default async function ACMEPage() {
  const supabase = await createClient()
  const { data: manufacturer } = await supabase
    .from('manufacturers')
    .select('*')
    .eq('slug', 'acme')
    .single()

  if (!manufacturer) notFound()

  return <BrandPageTemplate manufacturer={manufacturer} />
}
