'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { SaleEventWithProducts } from '@/lib/types/sale'

interface Props {
  saleEvents: SaleEventWithProducts[]
  selectedEventSlug?: string
  selectedCategory?: string
}

const SALE_TYPE_LABELS: Record<string, string> = {
  clearance: 'Clearance',
  flash: 'Flash Sale',
  seasonal: 'Seasonal',
  closeout: 'Closeout',
  weekend: 'Weekend Sale',
  holiday: 'Holiday Sale',
  manufacturer: 'Manufacturer Sale',
  other: 'Special Sale',
}

export default function SaleFilterSidebar({ saleEvents, selectedEventSlug, selectedCategory }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedEvent = saleEvents.find(e => e.slug === selectedEventSlug) ?? null

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val === null) {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    }
    router.push(`/sale?${params.toString()}`, { scroll: false })
  }

  // Group active events by sale_type
  const typeMap: Record<string, SaleEventWithProducts[]> = {}
  for (const ev of saleEvents) {
    if (!typeMap[ev.sale_type]) typeMap[ev.sale_type] = []
    typeMap[ev.sale_type].push(ev)
  }

  const activeCategories = selectedEvent?.categories ?? []
  const totalCount = saleEvents.reduce((s, e) => s + e.product_count, 0)

  return (
    <aside className="w-full shrink-0 lg:w-[280px]">
      {/* Active filter pills */}
      {(selectedEventSlug || selectedCategory) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedEventSlug && (
            <button
              onClick={() => updateParams({ event: null, category: null })}
              className="flex items-center gap-1 rounded-full bg-[#2D4A3E] px-3 py-1 text-xs text-white"
            >
              {selectedEvent?.name ?? selectedEventSlug}
              <span className="ml-1 text-white/70">×</span>
            </button>
          )}
          {selectedCategory && (
            <button
              onClick={() => updateParams({ category: null })}
              className="flex items-center gap-1 rounded-full bg-[#2D4A3E] px-3 py-1 text-xs text-white"
            >
              {selectedCategory.replace(/-/g, ' ')}
              <span className="ml-1 text-white/70">×</span>
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[#ede8e3] bg-white p-5">
        {/* SHOP BY SALE TYPE */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
          Shop by Sale Type
        </p>
        <div className="mb-1 border-b border-[#ede8e3] pb-4">
          <button
            onClick={() => updateParams({ event: null, category: null })}
            className={`flex w-full items-center justify-between py-1.5 text-sm transition-colors ${
              !selectedEventSlug
                ? 'font-semibold text-[#2D4A3E]'
                : 'text-[#1C1C1C] hover:text-[#2D4A3E]'
            }`}
          >
            <span>All Sales</span>
            <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#6B6560]">
              {totalCount}
            </span>
          </button>

          {Object.entries(typeMap).map(([type, events]) => {
            const isTypeSelected = events.some(e => e.slug === selectedEventSlug)
            const typeCount = events.reduce((s, e) => s + e.product_count, 0)
            return (
              <div key={type}>
                {events.length === 1 ? (
                  <button
                    onClick={() => updateParams({ event: events[0].slug, category: null })}
                    className={`flex w-full items-center justify-between py-1.5 text-sm transition-colors ${
                      isTypeSelected
                        ? 'font-semibold text-[#2D4A3E]'
                        : 'text-[#1C1C1C] hover:text-[#2D4A3E]'
                    }`}
                  >
                    <span>{SALE_TYPE_LABELS[type] ?? type}</span>
                    <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#6B6560]">
                      {typeCount}
                    </span>
                  </button>
                ) : (
                  <>
                    <p className={`py-1.5 text-sm font-medium ${isTypeSelected ? 'text-[#2D4A3E]' : 'text-[#1C1C1C]'}`}>
                      {SALE_TYPE_LABELS[type] ?? type}
                    </p>
                    {events.map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => updateParams({ event: ev.slug, category: null })}
                        className={`flex w-full items-center justify-between py-1 pl-3 text-sm transition-colors ${
                          ev.slug === selectedEventSlug
                            ? 'font-semibold text-[#2D4A3E]'
                            : 'text-[#6B6560] hover:text-[#2D4A3E]'
                        }`}
                      >
                        <span>{ev.name}</span>
                        <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-xs text-[#6B6560]">
                          {ev.product_count}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* PRODUCT TYPE — only show when a sale event is selected */}
        {selectedEvent && activeCategories.length > 0 && (
          <>
            <p className="mb-3 mt-4 text-xs font-semibold uppercase tracking-widest text-[#6B6560]">
              Product Type
            </p>
            <button
              onClick={() => updateParams({ category: null })}
              className={`flex w-full items-center py-1.5 text-sm transition-colors ${
                !selectedCategory
                  ? 'font-semibold text-[#2D4A3E]'
                  : 'text-[#1C1C1C] hover:text-[#2D4A3E]'
              }`}
            >
              All Categories
            </button>
            {activeCategories.map(cat => (
              <button
                key={cat}
                onClick={() => updateParams({ category: cat })}
                className={`flex w-full items-center py-1.5 text-sm capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'font-semibold text-[#2D4A3E]'
                    : 'text-[#1C1C1C] hover:text-[#2D4A3E]'
                }`}
              >
                {cat.replace(/-/g, ' ')}
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
