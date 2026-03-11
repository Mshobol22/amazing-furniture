export interface Product {
  id: string;
  name: string;
  slug: string;
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
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  stripe_payment_id?: string;
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
