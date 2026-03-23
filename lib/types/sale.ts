export type SaleEventType =
  | 'clearance'
  | 'flash'
  | 'seasonal'
  | 'closeout'
  | 'weekend'
  | 'holiday'
  | 'manufacturer'
  | 'other'

export interface SaleEvent {
  id: string
  name: string
  slug: string
  description: string | null
  sale_type: SaleEventType
  badge_text: string | null
  badge_color: string
  banner_headline: string | null
  banner_subtext: string | null
  discount_label: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SaleEventWithProducts extends SaleEvent {
  product_count: number
  categories: string[]
}
