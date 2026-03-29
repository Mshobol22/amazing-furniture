'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, isAdmin } from '@/lib/supabase/server'
import type { SaleEvent, SaleEventWithProducts } from '@/lib/types/sale'
import {
  applyAcmePlaceholderImageFilter,
  applyZinatexListingVisibilityFilter,
  attachVariantFromPrices,
  isHiddenAcmePlaceholderProduct,
  mapRowToProduct,
} from '@/lib/supabase/products'
import type { Product } from '@/types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) {
    throw new Error('Unauthorized')
  }
}

const SALE_EVENTS_QUERY = `
  SELECT
    se.*,
    COUNT(DISTINCT sep.product_id)::int AS product_count,
    COALESCE(
      array_agg(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL),
      '{}'
    ) AS categories
  FROM sale_events se
  LEFT JOIN sale_event_products sep ON sep.sale_event_id = se.id
  LEFT JOIN products p ON p.id = sep.product_id AND p.on_sale = true AND p.in_stock = true
  GROUP BY se.id
  ORDER BY se.sort_order ASC, se.created_at DESC
`

export async function getActiveSaleEvents(): Promise<SaleEventWithProducts[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_active_sale_events').select()
  // Fallback: direct query
  if (error || !data) {
    const { data: rows, error: err2 } = await supabase
      .from('sale_events')
      .select(`
        *,
        sale_event_products(
          product_id,
          products(category, on_sale, in_stock)
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (err2 || !rows) return []

    return rows.map((se: Record<string, unknown>) => {
      const junctions = (se.sale_event_products as Array<{ product_id: string; products: { category: string; on_sale: boolean; in_stock: boolean } | null }>) ?? []
      const validProducts = junctions.filter(j => j.products?.on_sale && j.products?.in_stock)
      const categories = Array.from(new Set(validProducts.map(j => j.products!.category).filter(Boolean)))
      return {
        ...se,
        product_count: validProducts.length,
        categories,
        sale_event_products: undefined,
      } as unknown as SaleEventWithProducts
    })
  }
  return data as SaleEventWithProducts[]
}

export async function getAllSaleEventsAdmin(): Promise<SaleEventWithProducts[]> {
  await verifyAdmin()
  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from('sale_events')
    .select(`
      *,
      sale_event_products(
        product_id,
        products(category, on_sale, in_stock)
      )
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error || !rows) return []

  return rows.map((se: Record<string, unknown>) => {
    const junctions = (se.sale_event_products as Array<{ product_id: string; products: { category: string; on_sale: boolean; in_stock: boolean } | null }>) ?? []
    const validProducts = junctions.filter(j => j.products?.on_sale && j.products?.in_stock)
    const categories = Array.from(new Set(validProducts.map(j => j.products!.category).filter(Boolean)))
    return {
      ...se,
      product_count: validProducts.length,
      categories,
      sale_event_products: undefined,
    } as unknown as SaleEventWithProducts
  })
}

export async function getSaleProducts(params: {
  saleEventId?: string
  category?: string
  page?: number
}): Promise<{ products: Product[]; total: number }> {
  const supabase = createAdminClient()
  const PAGE_SIZE = 15
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('on_sale', true)
    .eq('in_stock', true)

  if (params.category) {
    query = query.eq('category', params.category)
  }

  if (params.saleEventId) {
    const { data: junctions } = await supabase
      .from('sale_event_products')
      .select('product_id')
      .eq('sale_event_id', params.saleEventId)
    const productIds = (junctions ?? []).map((j: { product_id: string }) => j.product_id)
    if (productIds.length === 0) return { products: [], total: 0 }
    query = query.in('id', productIds)
  }

  query = query.range(from, to).order('created_at', { ascending: false })
  query = applyAcmePlaceholderImageFilter(query)
  query = applyZinatexListingVisibilityFilter(query)

  const { data, error, count } = await query
  if (error || !data) return { products: [], total: 0 }

  const mapped = (data as Record<string, unknown>[])
    .map((row) => mapRowToProduct(row))
    .filter((p) => !isHiddenAcmePlaceholderProduct(p))
  const products = await attachVariantFromPrices(mapped)

  return { products, total: count ?? 0 }
}

export async function createSaleEvent(
  data: Partial<SaleEvent>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const slug = data.slug || slugify(data.name ?? '')
    const { data: row, error } = await supabase
      .from('sale_events')
      .insert({
        name: data.name,
        slug,
        description: data.description ?? null,
        sale_type: data.sale_type ?? 'other',
        badge_text: data.badge_text ?? null,
        badge_color: data.badge_color ?? '#2D4A3E',
        banner_headline: data.banner_headline ?? null,
        banner_subtext: data.banner_subtext ?? null,
        discount_label: data.discount_label ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        is_active: data.is_active ?? false,
        sort_order: data.sort_order ?? 0,
      })
      .select('id')
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, id: row.id }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateSaleEvent(
  id: string,
  data: Partial<SaleEvent>
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() }
    delete updateData.id
    delete updateData.created_at
    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name)
    }
    const { error } = await supabase.from('sale_events').update(updateData).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deleteSaleEvent(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase.from('sale_events').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function addProductToSaleEvent(
  saleEventId: string,
  productId: string
): Promise<{ success: boolean }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('sale_event_products')
      .upsert({ sale_event_id: saleEventId, product_id: productId }, { onConflict: 'sale_event_id,product_id' })
    return { success: !error }
  } catch {
    return { success: false }
  }
}

export async function removeProductFromSaleEvent(
  saleEventId: string,
  productId: string
): Promise<{ success: boolean }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('sale_event_products')
      .delete()
      .eq('sale_event_id', saleEventId)
      .eq('product_id', productId)
    return { success: !error }
  } catch {
    return { success: false }
  }
}

export async function bulkAddProductsToSaleEvent(
  saleEventId: string,
  productIds: string[]
): Promise<{ success: boolean; added: number }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const rows = productIds.map(pid => ({ sale_event_id: saleEventId, product_id: pid }))
    const { data, error } = await supabase
      .from('sale_event_products')
      .upsert(rows, { onConflict: 'sale_event_id,product_id' })
      .select('id')
    if (error) return { success: false, added: 0 }
    return { success: true, added: data?.length ?? 0 }
  } catch {
    return { success: false, added: 0 }
  }
}

export async function searchProductsForSale(query: string): Promise<Product[]> {
  await verifyAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    .eq('in_stock', true)
    .limit(30)
  if (error || !data) return []
  return data as Product[]
}

export async function bulkAddAllOnSaleToEvent(
  saleEventId: string
): Promise<{ success: boolean; added: number }> {
  try {
    await verifyAdmin()
    const supabase = createAdminClient()
    const { data: onSaleProducts } = await supabase
      .from('products')
      .select('id')
      .eq('on_sale', true)
      .eq('in_stock', true)
    const ids = (onSaleProducts ?? []).map((p: { id: string }) => p.id)
    if (ids.length === 0) return { success: true, added: 0 }
    const rows = ids.map((pid: string) => ({ sale_event_id: saleEventId, product_id: pid }))
    const { data, error } = await supabase
      .from('sale_event_products')
      .upsert(rows, { onConflict: 'sale_event_id,product_id' })
      .select('id')
    if (error) return { success: false, added: 0 }
    return { success: true, added: data?.length ?? 0 }
  } catch {
    return { success: false, added: 0 }
  }
}

export async function getProductsInSaleEvent(saleEventId: string): Promise<Product[]> {
  await verifyAdmin()
  const supabase = createAdminClient()
  const { data: junctions } = await supabase
    .from('sale_event_products')
    .select('product_id')
    .eq('sale_event_id', saleEventId)
  const ids = (junctions ?? []).map((j: { product_id: string }) => j.product_id)
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('products').select('*').in('id', ids)
  if (error || !data) return []
  return data as Product[]
}
