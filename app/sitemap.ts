import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient()
  const { data: products } = await supabase
    .from('products')
    .select('slug, created_at')
    .eq('in_stock', true)

  const baseUrl = 'https://amazinghomefurniturestore.com'

  const staticPages = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/collections/all`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/collections/sofa`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/collections/bed`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/collections/chair`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/collections/table`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/collections/cabinet`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/collections/tv-stand`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/financing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/shipping`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/returns`, changeFrequency: 'monthly', priority: 0.4 },
  ] as MetadataRoute.Sitemap

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p: { slug: string; created_at: string }) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: new Date(p.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...productPages]
}