export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  description: string;
  price: number;
  compare_price?: number;
  sale_price?: number;
  on_sale?: boolean;
  images: string[];
  category: string;
  in_stock: boolean;
  rating: number;
  review_count: number;
  tags: string[];
  created_at: string;
  manufacturer?: string | null;
  has_variants?: boolean;
  variant_type?: string | null;
  // Collection fields (added migration March 2026)
  collection_group?: string | null;
  piece_type?: string | null;
  is_collection_hero?: boolean;
  bundle_skus?: string[];
  images_validated?: boolean | null;
  color?: string | null;
}

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  compare_at_price: number | null;
  stock_qty: number;
  in_stock: boolean;
  image_url: string | null;
  sort_order: number;
};

export interface CartItem {
  product: Product;
  quantity: number;
  variant_id?: string;
  variant_sku?: string;
  variant_size?: string;
  variant_color?: string;
  variant_price?: number;
  variant_image?: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  stripe_payment_intent_id?: string;
  shipping_address: ShippingAddress;
  created_at: string;
}

export interface ShippingAddress {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  product_count: number;
}

export type ReelQueryResult = {
  collectionPieces: Product[]
  relatedProducts: Product[]
}
