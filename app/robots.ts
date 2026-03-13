import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account/', '/checkout/'],
      },
    ],
    sitemap: 'https://amazinghomefurniturestore.com/sitemap.xml',
    host: 'https://amazinghomefurniturestore.com',
  }
}