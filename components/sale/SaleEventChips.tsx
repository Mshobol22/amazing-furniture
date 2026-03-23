'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { SaleEventWithProducts } from '@/lib/types/sale'

interface Props {
  saleEvents: SaleEventWithProducts[]
  selectedEventSlug?: string
}

export default function SaleEventChips({ saleEvents, selectedEventSlug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function selectEvent(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (slug) {
      params.set('event', slug)
    } else {
      params.delete('event')
    }
    params.delete('category')
    params.delete('page')
    router.push(`/sale?${params.toString()}`, { scroll: false })
  }

  if (saleEvents.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-8">
      <button
        onClick={() => selectEvent(null)}
        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
          !selectedEventSlug
            ? 'bg-[#2D4A3E] text-[#FAF8F5]'
            : 'bg-[#1C1C1C] text-[#FAF8F5] hover:bg-[#2D4A3E]'
        }`}
      >
        All Sales
      </button>
      {saleEvents.map(ev => (
        <button
          key={ev.id}
          onClick={() => selectEvent(ev.slug)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            selectedEventSlug === ev.slug
              ? 'bg-[#2D4A3E] text-[#FAF8F5]'
              : 'bg-[#1C1C1C] text-[#FAF8F5] hover:bg-[#2D4A3E]'
          }`}
        >
          {ev.name}
          {ev.badge_text && ev.badge_text !== ev.name && (
            <span className="ml-1.5 opacity-70">· {ev.badge_text}</span>
          )}
        </button>
      ))}
    </div>
  )
}
