'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Pencil, Trash2, Plus, Search, Package } from 'lucide-react'
import type { SaleEventWithProducts, SaleEvent, SaleEventType } from '@/lib/types/sale'
import type { Product } from '@/types'
import SaleEventModal from './SaleEventModal'
import {
  deleteSaleEvent,
  updateSaleEvent,
  addProductToSaleEvent,
  removeProductFromSaleEvent,
  bulkAddAllOnSaleToEvent,
  searchProductsForSale,
  getProductsInSaleEvent,
} from '@/lib/actions/sale-actions'

const TYPE_COLORS: Record<SaleEventType, string> = {
  clearance: 'bg-orange-100 text-orange-700',
  flash: 'bg-red-100 text-red-700',
  seasonal: 'bg-blue-100 text-blue-700',
  closeout: 'bg-yellow-100 text-yellow-700',
  weekend: 'bg-purple-100 text-purple-700',
  holiday: 'bg-emerald-100 text-emerald-700',
  manufacturer: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
}

const TYPE_LABELS: Record<SaleEventType, string> = {
  clearance: 'Clearance',
  flash: 'Flash Sale',
  seasonal: 'Seasonal',
  closeout: 'Closeout',
  weekend: 'Weekend',
  holiday: 'Holiday',
  manufacturer: 'Manufacturer',
  other: 'Other',
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  initialEvents: SaleEventWithProducts[]
}

export default function SalesManagerClient({ initialEvents }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'events' | 'assignments'>('events')
  const [events, setEvents] = useState(initialEvents)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SaleEvent | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Product assignments
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [assignedProducts, setAssignedProducts] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [assignLoading, setAssignLoading] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  function openCreate() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  function openEdit(ev: SaleEvent) {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEvent(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    await deleteSaleEvent(id)
    setDeleteConfirm(null)
    setDeleteLoading(false)
    router.refresh()
  }

  async function handleToggleActive(ev: SaleEventWithProducts) {
    await updateSaleEvent(ev.id, { is_active: !ev.is_active })
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_active: !e.is_active } : e))
  }

  // ─── Product Assignments ──────────────────────────────────────────────────

  async function handleEventSelect(id: string) {
    setSelectedEventId(id)
    setSearchResults([])
    setSearchQuery('')
    if (id) {
      const products = await getProductsInSaleEvent(id)
      setAssignedProducts(products)
    } else {
      setAssignedProducts([])
    }
  }

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    const results = await searchProductsForSale(q)
    setSearchResults(results)
    setSearchLoading(false)
  }, [])

  async function handleAdd(productId: string) {
    if (!selectedEventId) return
    setAssignLoading(productId)
    await addProductToSaleEvent(selectedEventId, productId)
    const added = searchResults.find(p => p.id === productId)
    if (added && !assignedProducts.some(p => p.id === productId)) {
      setAssignedProducts(prev => [...prev, added])
    }
    setAssignLoading(null)
    router.refresh()
  }

  async function handleRemove(productId: string) {
    if (!selectedEventId) return
    setAssignLoading(productId)
    await removeProductFromSaleEvent(selectedEventId, productId)
    setAssignedProducts(prev => prev.filter(p => p.id !== productId))
    setAssignLoading(null)
    router.refresh()
  }

  async function handleBulkAdd() {
    if (!selectedEventId) return
    setBulkLoading(true)
    await bulkAddAllOnSaleToEvent(selectedEventId)
    const products = await getProductsInSaleEvent(selectedEventId)
    setAssignedProducts(products)
    router.refresh()
    setBulkLoading(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1C]">Sales Manager</h1>
          <p className="mt-1 text-sm text-gray-500">Manage sale events and product assignments</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#2D4A3E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3B5E4F]"
        >
          <Plus className="h-4 w-4" />
          Create New Sale Event
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {(['events', 'assignments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white text-[#1C1C1C] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'events' ? 'Sale Events' : 'Product Assignments'}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Sale Events ── */}
      {activeTab === 'events' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {events.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No sale events yet</p>
              <p className="text-sm">Click &quot;Create New Sale Event&quot; to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map(ev => (
                  <tr key={ev.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-[#1C1C1C]">{ev.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[ev.sale_type]}`}>
                        {TYPE_LABELS[ev.sale_type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ev.badge_text ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs font-bold text-white"
                          style={{ backgroundColor: ev.badge_color }}
                        >
                          {ev.badge_text}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ev.discount_label ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {ev.start_date || ev.end_date
                        ? `${formatDate(ev.start_date) ?? '∞'} – ${formatDate(ev.end_date) ?? '∞'}`
                        : 'No expiry'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-[#2D4A3E]">
                      {ev.product_count}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        role="switch"
                        aria-checked={ev.is_active}
                        onClick={() => handleToggleActive(ev)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${ev.is_active ? 'bg-[#2D4A3E]' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ev.is_active ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(ev)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#2D4A3E]"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(ev.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab 2: Product Assignments ── */}
      {activeTab === 'assignments' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left panel: selector + search */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Select Sale Event
              </label>
              <select
                value={selectedEventId}
                onChange={e => handleEventSelect(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
              >
                <option value="">— Choose a sale event —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            {selectedEventId && (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Search products by name or SKU…"
                      className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2D4A3E] focus:ring-1 focus:ring-[#2D4A3E]"
                    />
                  </div>
                  <button
                    onClick={handleBulkAdd}
                    disabled={bulkLoading}
                    className="shrink-0 rounded-lg border border-[#2D4A3E] px-3 py-2 text-xs font-semibold text-[#2D4A3E] transition-colors hover:bg-[#2D4A3E] hover:text-white disabled:opacity-50"
                  >
                    {bulkLoading ? 'Adding…' : 'Bulk Add On-Sale'}
                  </button>
                </div>

                {searchLoading && (
                  <p className="text-sm text-gray-400">Searching…</p>
                )}

                {searchResults.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                    {searchResults.map(p => {
                      const alreadyAdded = assignedProducts.some(ap => ap.id === p.id)
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {p.images?.[0] && (
                              <Image
                                src={p.images[0]}
                                alt={p.name}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-[#1C1C1C]">{p.name}</p>
                            <p className="text-xs text-gray-400">
                              {p.sku ?? p.category} · ${p.price.toLocaleString()}
                              {p.on_sale && <span className="ml-1.5 text-[#2D4A3E] font-medium">· On Sale</span>}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAdd(p.id)}
                            disabled={alreadyAdded || assignLoading === p.id}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              alreadyAdded
                                ? 'bg-gray-100 text-gray-400 cursor-default'
                                : 'bg-[#2D4A3E] text-white hover:bg-[#3B5E4F] disabled:opacity-50'
                            }`}
                          >
                            {alreadyAdded ? 'Added' : assignLoading === p.id ? '…' : 'Add to Sale'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right panel: assigned products */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Products in this event ({assignedProducts.length})
            </p>
            {!selectedEventId ? (
              <p className="text-sm text-gray-400">Select a sale event to see its products</p>
            ) : assignedProducts.length === 0 ? (
              <p className="text-sm text-gray-400">No products assigned yet</p>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                {assignedProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {p.images?.[0] && (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[#1C1C1C]">{p.name}</p>
                      <p className="text-xs text-gray-400">${p.price.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(p.id)}
                      disabled={assignLoading === p.id}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {assignLoading === p.id ? '…' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <SaleEventModal event={editingEvent} onClose={closeModal} />
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[#1C1C1C]">Delete Sale Event?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will permanently delete the sale event and all product assignments. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#1C1C1C] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
