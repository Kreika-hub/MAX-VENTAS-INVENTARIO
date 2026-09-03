-- ==============================================================================
-- MAX VENTAS — SCRIPT DE UNIFICACIÓN DE BASE DE DATOS (SUPABASE)
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabla de Productos (Unificada)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  weight DECIMAL(6,2) DEFAULT 1,
  category TEXT,
  images TEXT[] DEFAULT '{}',
  slug TEXT,
  is_active BOOLEAN DEFAULT true,
  talla_mode TEXT DEFAULT 'global',
  talla_global TEXT,
  talla_values TEXT[],
  color_mode TEXT DEFAULT 'global',
  color_global TEXT,
  color_values TEXT[],
  material_mode TEXT DEFAULT 'global',
  material_global TEXT,
  material_values TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la tabla ya existía con el esquema viejo, agregar columnas faltantes
ALTER TABLE products ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(6,2) DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla_mode TEXT DEFAULT 'global';
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla_global TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS talla_values TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_mode TEXT DEFAULT 'global';
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_global TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS color_values TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_mode TEXT DEFAULT 'global';
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_global TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_values TEXT[];

-- Sincronizar name <-> title y generar slug para productos existentes
UPDATE products SET name = title WHERE name IS NULL AND title IS NOT NULL;
UPDATE products SET title = name WHERE title IS NULL AND name IS NOT NULL;
UPDATE products SET slug = LOWER(REGEXP_REPLACE(COALESCE(name, title, 'producto'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 6) WHERE slug IS NULL OR slug = '';

-- 3. Tabla de Variantes
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  talla TEXT,
  color TEXT,
  material TEXT,
  sku TEXT,
  stock INT DEFAULT 0,
  shopify_stock INT DEFAULT 0,
  precio NUMERIC DEFAULT 0
);

-- 4. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT NOT NULL,
  phone TEXT,
  country_code TEXT DEFAULT '+58',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Ventas Manuales / Físicas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  channel TEXT DEFAULT 'Shopify',
  status TEXT DEFAULT 'Vendido',
  quantity INT DEFAULT 1,
  total_price NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  client_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Zonas de Envío (Tienda Online)
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zip_start TEXT,
  zip_end TEXT,
  zip_prefixes TEXT[] DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  base_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_lb DECIMAL(10,2) DEFAULT 0,
  free_threshold DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tasas de Impuesto / Taxes USA
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,
  state_name TEXT NOT NULL,
  city TEXT,
  zip TEXT,
  rate DECIMAL(5,4) NOT NULL,
  is_default BOOLEAN DEFAULT false
);

-- Índice único para evitar duplicados en tasas de impuestos
CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_rates_unique 
  ON tax_rates (state_code, COALESCE(city, ''), COALESCE(zip, ''));

-- 8. Órdenes de la Tienda Online
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_zone_id UUID REFERENCES shipping_zones(id),
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'zelle' CHECK (payment_method IN ('zelle','bank_transfer')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','confirmed','failed')),
  tracking_number TEXT,
  carrier TEXT DEFAULT 'usps',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Items de cada Orden
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- 10. Configuración de la Tienda (Zelle, banco, logo)
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT DEFAULT 'MAX VENTAS',
  bank_name TEXT,
  account_number TEXT,
  routing_number TEXT,
  account_holder TEXT,
  zelle_email TEXT,
  zelle_phone TEXT,
  payment_instructions TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. POLÍTICAS DE SEGURIDAD (RLS)
-- ==============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read/write products" ON products;
CREATE POLICY "public read/write products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write variants" ON product_variants;
CREATE POLICY "public read/write variants" ON product_variants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write sales" ON sales;
CREATE POLICY "public read/write sales" ON sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write clients" ON clients;
CREATE POLICY "public read/write clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write shipping_zones" ON shipping_zones;
CREATE POLICY "public read/write shipping_zones" ON shipping_zones FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write tax_rates" ON tax_rates;
CREATE POLICY "public read/write tax_rates" ON tax_rates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write orders" ON orders;
CREATE POLICY "public read/write orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write order_items" ON order_items;
CREATE POLICY "public read/write order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read/write store_settings" ON store_settings;
CREATE POLICY "public read/write store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

-- Permisos para subida de fotos en Storage
DROP POLICY IF EXISTS "public insert product-images" ON storage.objects;
CREATE POLICY "public insert product-images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public select product-images" ON storage.objects;
CREATE POLICY "public select product-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public update product-images" ON storage.objects;
CREATE POLICY "public update product-images" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "public delete product-images" ON storage.objects;
CREATE POLICY "public delete product-images" ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-images');

-- ==============================================================================
-- 12. DATOS INICIALES (Taxes de California y Zonas de Envío de ejemplo)
-- ==============================================================================
INSERT INTO tax_rates (state_code, state_name, city, zip, rate, is_default) VALUES
('CA','California',NULL,NULL,0.0725,true),
('CA','California','Los Angeles',NULL,0.0975,false),
('CA','California','San Francisco',NULL,0.0875,false),
('CA','California','San Diego',NULL,0.0775,false),
('CA','California','Santa Monica',NULL,0.1075,false),
('CA','California','Oakland',NULL,0.1025,false),
('CA','California','Sacramento',NULL,0.0875,false),
('CA','California','San Jose',NULL,0.0925,false)
ON CONFLICT DO NOTHING;

INSERT INTO shipping_zones (name, states, zip_prefixes, base_cost, cost_per_lb, free_threshold, is_active) VALUES
('California Local', ARRAY['CA'], ARRAY['90','91','92','93','94'], 5.00, 0.50, 50.00, true),
('West Coast', ARRAY['CA','OR','WA','NV','AZ'], ARRAY[''], 8.00, 0.75, 75.00, true),
('Texas & Southwest', ARRAY['TX','NM','CO','UT'], ARRAY[''], 10.00, 0.90, 100.00, true),
('East Coast', ARRAY['NY','NJ','FL','PA','MA','CT','MD','VA','NC','SC','GA'], ARRAY[''], 12.00, 1.00, 100.00, true),
('Midwest', ARRAY['IL','OH','MI','IN','WI','MN','IA','MO','KS','NE'], ARRAY[''], 11.00, 0.95, 100.00, true),
('Rest of USA', ARRAY[''], ARRAY[''], 15.00, 1.25, 100.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO store_settings (store_name) VALUES ('MAX VENTAS')
ON CONFLICT DO NOTHING;
