'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createSaleEvent, updateSaleEvent } from '@/lib/actions/sale-actions'
import type { SaleEvent, SaleEventType } from '@/lib/types/sale'

const SALE_TYPES: { value: SaleEventType; label: string }[] = [
  { value: 'clearance', label: 'Clearance' },
  { value: 'flash', label: 'Flash Sale' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'closeout', label: 'Closeout' },
  { value: 'weekend', label: 'Weekend Sale' },
  { value: 'holiday', label: 'Holiday Sale' },
  { value: 'manufacturer', label: 'Manufacturer Sale' },
  { value: 'other', label: 'Other' },
]

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

interface Props {
  event?: SaleEvent | null
  onClose: () => void
}

export default function SaleEventModal({ event, onClose }: Props) {
  const router = useRouter()
  const isEdit = !!event

  const [form, setForm] = useState({
    name: event?.name ?? '',
    slug: event?.slug ?? '',
    description: event?.description ?? '',
    sale_type: (event?.sale_type ?? 'other') as SaleEventType,
    badge_text: event?.badge_text ?? '',
    badge_color: event?.badge_color ?? '#2D4A3E',
    banner_headline: event?.banner_headline ?? '',
    banner_subtext: event?.banner_subtext ?? '',
    discount_label: event?.discount_label ?? '',
    start_date: event?.start_date ? event.start_date.slice(0, 10) : '',
    end_date: event?.end_date ? event.end_date.slice(0, 10) : '',
    is_active: event?.is_active ?? false,
    sort_order: event?.sort_order ?? 0,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleNameBlur() {
    if (!isEdit && form.name && !form.slug) {
      setForm(f => ({ ...f, slug: slugify(f.name) }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const data = {
      ...form,
      description: form.description || null,
      badge_text: form.badge_text || null,
      banner_headline: form.banner_headline || null,
      banner_subtext: form.banner_subtext || null,
      discount_label: form.discount_label || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }

    const result = isEdit
      ? await updateSaleEvent(event.id, data)
      : await createSaleEvent(data)

    if (!result.success) {
      setError(result.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#1C1C1C]">
            {isEdit ? 'Edit Sale Event' : 'Create Sale Event'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onBlur={handleNameBlur}
                placeholder="Summer Clearance"
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">
                Slug <span className="font-normal text-gray-400">(auto-generated)</span>
              </label>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="summer-clearance"
                className="w-full rounded-lg border border-[#ede8e3] bg-[#FAF8F5] px-3 py-2 text-sm font-mono outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Sale Type *</label>
              <select
                required
                value={form.sale_type}
                onChange={e => setForm(f => ({ ...f, sale_type: e.target.value as SaleEventType }))}
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              >
                {SALE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Badge Text</label>
              <input
                value={form.badge_text}
                onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                placeholder="CLEARANCE"
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Badge Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.badge_color}
                  onChange={e => setForm(f => ({ ...f, badge_color: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border border-[#ede8e3] bg-white p-0.5"
                />
                <span className="font-mono text-xs text-[#6B6560]">{form.badge_color}</span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Discount Label</label>
              <input
                value={form.discount_label}
                onChange={e => setForm(f => ({ ...f, discount_label: e.target.value }))}
                placeholder="Up to 40% Off"
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Banner Headline</label>
              <input
                value={form.banner_headline}
                onChange={e => setForm(f => ({ ...f, banner_headline: e.target.value }))}
                placeholder="Summer Clearance — Up to 40% Off"
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Banner Subtext</label>
              <input
                value={form.banner_subtext}
                onChange={e => setForm(f => ({ ...f, banner_subtext: e.target.value }))}
                placeholder="Shop limited-time deals on furniture"
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[#6B6560]">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="w-full rounded-lg border border-[#ede8e3] px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.is_active ? 'bg-[#2D4A3E]' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
              <label className="text-sm font-medium text-[#1C1C1C]">Active</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#ede8e3] px-4 py-2 text-sm font-semibold text-[#1C1C1C] hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#2D4A3E] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3B5E4F] disabled:opacity-60"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
