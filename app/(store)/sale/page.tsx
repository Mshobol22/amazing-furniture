import type { Metadata } from 'next'
import { Tag } from 'lucide-react'
import { getActiveSaleEvents, getSaleProducts } from '@/lib/actions/sale-actions'
import SaleFilterSidebar from '@/components/sale/SaleFilterSidebar'
import SaleProductGrid from '@/components/sale/SaleProductGrid'
import SaleEventChips from '@/components/sale/SaleEventChips'

export const metadata: Metadata = {
  title: 'Furniture Sale | Amazing Home Furniture Store',
  description:
    'Shop our latest furniture sales and clearance events. Save big on sofas, beds, dining sets, rugs, and more.',
}

interface Props {
  searchParams: Promise<{ event?: string; category?: string; page?: string }>
}

export default async function SalePage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const eventSlug =
    typeof resolvedSearchParams.event === 'string'
      ? resolvedSearchParams.event.slice(0, 80)
      : undefined
  const category =
    typeof resolvedSearchParams.category === 'string'
      ? resolvedSearchParams.category.slice(0, 40)
      : undefined
  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? '1', 10) || 1)

  // Fetch sale events first so we can resolve slug → id
  const saleEvents = await getActiveSaleEvents()
  const selectedEvent = saleEvents.find(e => e.slug === eventSlug) ?? null

  const { products, total } = await getSaleProducts({
    saleEventId: selectedEvent?.id,
    category,
    page,
  })

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Banner */}
      <section className="bg-[#2D4A3E] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8">
          <div>
            <h1 className="text-4xl font-bold text-[#FAF8F5] sm:text-5xl">On Sale Now</h1>
            <p className="mt-2 text-[#FAF8F5]/75 sm:text-lg">
              Exclusive deals on quality furniture
            </p>
          </div>
          <div aria-hidden className="shrink-0">
            <Tag className="h-16 w-16 text-[#FAF8F5]/40" strokeWidth={1.5} />
          </div>
        </div>
      </section>

      {/* Sale event chips */}
      {saleEvents.length > 0 && (
        <div className="border-b border-[#ede8e3] bg-white py-3">
          <SaleEventChips saleEvents={saleEvents} selectedEventSlug={eventSlug} />
        </div>
      )}

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Mobile filter button */}
        {saleEvents.length > 0 && (
          <div className="mb-4 lg:hidden">
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[#ede8e3] bg-white px-4 py-2 text-sm font-semibold text-[#1C1C1C]">
                <span>Filters</span>
                {(eventSlug || category) && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2D4A3E] text-[10px] text-white">
                    {[eventSlug, category].filter(Boolean).length}
                  </span>
                )}
              </summary>
              <div className="mt-3">
                <SaleFilterSidebar
                  saleEvents={saleEvents}
                  selectedEventSlug={eventSlug}
                  selectedCategory={category}
                />
              </div>
            </details>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar — desktop only */}
          {saleEvents.length > 0 && (
            <div className="hidden lg:block">
              <SaleFilterSidebar
                saleEvents={saleEvents}
                selectedEventSlug={eventSlug}
                selectedCategory={category}
              />
            </div>
          )}

          {/* Product grid */}
          <SaleProductGrid
            products={products}
            total={total}
            page={page}
            selectedEvent={selectedEvent}
            selectedEventSlug={eventSlug}
            selectedCategory={category}
          />
        </div>
      </div>
    </div>
  )
}
