export type Language = 'fr' | 'ar';

export type OrderStatus =
  | 'En attente'
  | 'Confirmée'
  | 'En préparation'
  | 'Expédiée'
  | 'Livrée'
  | 'Annulée';

export interface User {
  id: number;
  username: string | null;
  email: string;
  role: 'admin' | 'customer';
  must_change_password: number;
  full_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
}

export interface Category {
  id: number;
  slug: string;
  name_fr: string;
  name_ar: string;
  description_fr: string;
  description_ar: string;
  sort_order: number;
}

export interface Brand {
  id: number;
  slug: string;
  name: string;
  country: string;
  description_fr: string;
  description_ar: string;
  featured: number;
}

export interface Product {
  id: number;
  reference: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  brand_id: number;
  brand_name: string;
  brand_slug: string;
  brand_country?: string;
  category_id: number;
  category_name_fr: string;
  category_name_ar: string;
  category_slug: string;
  price_mad: number;
  old_price_mad: number | null;
  description_fr: string;
  description_ar: string;
  color_fr: string;
  color_ar: string;
  available_colors: string[];
  frame_material_fr: string;
  frame_material_ar: string;
  dimensions: string;
  stock: number;
  badge: 'Nouveau' | 'Promotion' | 'Best-seller' | null;
  is_featured: boolean;
  images: string[];
  created_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  author_name: string;
  rating: number;
  comment: string;
  is_verified: number;
  created_at: string;
  product_name_fr?: string;
  product_slug?: string;
}

export interface StoreSettings {
  id: number;
  logo_text: string;
  logo_image: string;
  hero_banner_url: string;
  about_banner_url: string;
  hero_title_fr: string;
  hero_title_ar: string;
  hero_subtitle_fr: string;
  hero_subtitle_ar: string;
  about_title_fr: string;
  about_title_ar: string;
  about_text_fr: string;
  about_text_ar: string;
  store_address: string;
  whatsapp_number: string;
  phone_number: string;
  email: string;
  opening_hours_fr: string;
  opening_hours_ar: string;
  instagram_url: string;
  facebook_url: string;
  shipping_fee_mad: number;
  free_shipping_threshold_mad: number;
  cgv_fr: string;
  cgv_ar: string;
  privacy_fr: string;
  privacy_ar: string;
  payment_gateway_configured: number;
  payment_gateway_provider: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_reference: string;
  selected_color: string;
  quantity: number;
  unit_price_mad: number;
  total_price_mad: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number | null;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shipping_address: string;
  shipping_city: string;
  subtotal_mad: number;
  discount_mad: number;
  shipping_fee_mad: number;
  total_mad: number;
  coupon_code: string | null;
  payment_method: 'cod' | 'card';
  payment_status: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface Coupon {
  id: number;
  code: string;
  discount_percent: number;
  expires_at: string;
  is_active: number;
}
