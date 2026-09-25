export interface SiteConfig {
  name: string;
  tagline: string;
  currency: string;
  locale: string;
  categoriesSectionTitle?: string;
  description?: string;
  ogImage?: string;
}

export interface Slide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn: string;
  image: string;
  parentId?: string | null;
  sortOrder?: number;
  children?: Category[];
}

export interface Product {
  id: string;
  name: string;
  nameDe?: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPercent: number;
  vatRate: number;
  categoryId: string;
  image: string;
  images: string[];
  featured?: boolean;
  stock: number;
  active?: boolean;
  inStock: boolean;
  weightValue?: number | null;
  weightUnit?: string;
  barcode?: string | null;
  maxOrderQuantity: number | null;
  ingredients?: string;
  allergens?: string;
  originCountry?: string;
  bestBeforeNote?: string;
  /** Feste Highlight-Badges (z. B. bestseller, sale, quality) */
  badges?: string[];
  /** Freie kurze Notiz, wird als Highlight-Badge angezeigt */
  customNote?: string;
}

export interface CatalogData {
  site: SiteConfig;
  slider: Slide[];
  categories: Category[];
  products: Product[];
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

export type StaffRole = "admin" | "employee";
export type UserRole = "customer" | StaffRole;
export type HalalStatus = "halal" | "nicht_halal" | "unbekannt";

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  street?: string;
  email: string;
  role?: UserRole;
}

export interface FoodCategory {
  id: string;
  name_ar: string;
  name_de: string;
  image: string | null;
  sort_order: number;
  parent_id: string | null;
  deleted_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FoodProduct {
  id: string;
  name_ar: string;
  name_de: string;
  description: string;
  price: number;
  currency: string;
  category_id: string | null;
  image: string | null;
  images: string[];
  ingredients: string;
  allergens: string;
  origin_country: string;
  weight_value: number | null;
  weight_unit: string;
  gross_weight_value: number | null;
  gross_weight_unit: string;
  best_before_note: string;
  vat_rate: number;
  purchase_price: number | null;
  discount_percent: number;
  barcode: string | null;
  product_number: string | null;
  max_order_quantity: number | null;
  stock_quantity: number;
  status?: "published" | "draft";
  badges?: string[];
  custom_note?: string;
  deleted_at: string | null;
  created_at?: string;
  updated_at?: string;
  category?: Pick<FoodCategory, "id" | "name_ar" | "name_de"> | null;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  actor?: Pick<UserProfile, "full_name" | "first_name" | "last_name" | "email"> | null;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  street: string;
  email: string;
  password: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  customer_email: string | null;
  status: "pending" | "paid" | "cancelled" | "refunded";
  subtotal: number;
  discount_amount: number;
  total: number;
  discount_code: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  created_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  usage_count: number;
  usage_limit: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  activeDiscounts: number;
}

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  category_id: string;
  image: string;
  featured: boolean;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
