export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  weight: number;
  category: string;
  images: string[];
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  weight: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  zip_prefixes: string[];
  base_cost: number;
  cost_per_lb: number;
  free_threshold: number | null;
  is_active: boolean;
}

export interface TaxRate {
  id: string;
  state_code: string;
  state_name: string;
  city: string | null;
  zip: string | null;
  rate: number;
  is_default: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customer_email: string;
  customer_name: string;
  customer_phone: string;
  shipping_address: ShippingAddress;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  shipping_cost: number;
  shipping_zone_id: string | null;
  total: number;
  payment_method: 'zelle' | 'bank_transfer';
  payment_status: 'pending' | 'confirmed' | 'failed';
  tracking_number: string | null;
  carrier: string;
  notes: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  bank_name: string;
  account_number: string;
  routing_number: string;
  account_holder: string;
  zelle_email: string;
  zelle_phone: string;
  payment_instructions: string;
  logo_url: string;
  primary_color: string;
  banner_pc_url?: string;
  banner_mobile_url?: string;
  banner_title?: string;
  banner_subtitle?: string;
  banner_button_text?: string;
  banner_button_link?: string;
  whatsapp_number?: string;
}
