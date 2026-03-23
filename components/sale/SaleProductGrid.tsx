import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/types'
import type { SaleEventWithProducts } from '@/lib/types/sale'

interface Props {
  products: Product[]
  total: number
  page: number
  selectedEvent?: SaleEventWithProducts | null
  selectedEventSlug?: string
  selectedCategory?: string
}

function buildPageUrl(eventSlug?: string, category?: string, page?: number) {
  const params = new URLSearchParams()
  if (eventSlug) params.set('event', eventSlug)
  if (category) params.set('category', category)
  if (page && page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/sale${qs ? `?${qs}` : ''}`
}

export default function SaleProductGrid({
  products,
  total,
  page,
  selectedEvent,
  selectedEventSlug,
  selectedCategory,
}: Props) {
  const PAGE_SIZE = 24
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const badgeText = selectedEvent?.badge_text || 'ON SALE'
  const badgeColor = selectedEvent?.badge_color || '#2D4A3E'

  if (products.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="mb-2 text-lg font-semibold text-[#1C1C1C]">No sale products yet</p>
        <p className="mb-6 text-sm text-[#6B6560]">
          No sale products in this category yet — check back soon!
        </p>
        <Link
          href="/collections/all"
          className="rounded-lg bg-[#2D4A3E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3B5E4F]"
        >
          Shop All Products
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-4 text-sm text-[#6B6560]">{total} products on sale</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(product => {
          const image = product.images?.[0] ?? null
          const salePrice = product.sale_price
          const comparePrice = product.compare_price ?? product.price
          const savings =
            salePrice && comparePrice > salePrice
              ? Math.round(comparePrice - salePrice)
              : null

          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group rounded-xl border border-[#ede8e3] bg-white overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#FAF8F5]">
                {image ? (
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="h-full w-full bg-[#ede8e3]" />
                )}
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ backgroundColor: badgeColor }}
                >
                  {badgeText}
                </span>
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm font-medium text-[#1C1C1C] group-hover:text-[#2D4A3E] transition-colors">
                  {product.name}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {salePrice ? (
                    <>
                      <span className="text-base font-bold text-[#2D4A3E]">
                        ${salePrice.toLocaleString()}
                      </span>
                      <span className="text-sm text-[#6B6560] line-through">
                        ${comparePrice.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-base font-bold text-[#2D4A3E]">
                      ${product.price.toLocaleString()}
                    </span>
                  )}
                  {savings && savings > 0 && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                      Save ${savings.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={buildPageUrl(selectedEventSlug, selectedCategory, page - 1)}
              className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-[#6B6560]">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildPageUrl(selectedEventSlug, selectedCategory, page + 1)}
              className="rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-[#FAF8F5]"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
