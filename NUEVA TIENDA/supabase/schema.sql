-- ============================================================
-- MAX-VENTAS — Schema Completo
-- Tienda Shopify-Style con Admin + Storefront
-- ============================================================

-- Tabla de productos (tu inventario actual, extendido)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  weight DECIMAL(6,2) DEFAULT 1,          -- peso en libras para envío
  category TEXT,
  images TEXT[],                           -- array de URLs
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ZONAS DE ENVÍO
-- ============================================================
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- ej: "California", "West Coast"
  zip_start TEXT,                          -- rango ZIP inicio
  zip_end TEXT,                            -- rango ZIP fin
  zip_prefixes TEXT[] DEFAULT '{}',        -- ej: {'90','91'} para LA
  states TEXT[] DEFAULT '{}',              -- ej: {'CA','NV'}
  base_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_lb DECIMAL(10,2) DEFAULT 0,
  free_threshold DECIMAL(10,2),          -- envío gratis si supera este monto
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAXES POR ESTADO/CIUDAD/ZIP
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT NOT NULL,                -- 'CA', 'TX', etc.
  state_name TEXT NOT NULL,
  city TEXT,                               -- NULL = tasa estatal default
  zip TEXT,
  rate DECIMAL(5,4) NOT NULL,              -- 0.0725 = 7.25%
  is_default BOOLEAN DEFAULT false,
  UNIQUE(state_code, COALESCE(city,''), COALESCE(zip,''))
);

-- ============================================================
-- ÓRDENES
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,       -- ej: MAX-000001
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,         -- {street, city, state, zip, country}
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_zone_id UUID REFERENCES shipping_zones(id),
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'zelle' 
    CHECK (payment_method IN ('zelle','bank_transfer')),
  payment_status TEXT DEFAULT 'pending' 
    CHECK (payment_status IN ('pending','confirmed','failed')),
  tracking_number TEXT,
  carrier TEXT DEFAULT 'usps',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ITEMS DE ORDEN
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- CONFIGURACIÓN DE LA TIENDA
-- ============================================================
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

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_tax_state ON tax_rates(state_code);
CREATE INDEX IF NOT EXISTS idx_shipping_zone_state ON shipping_zones USING GIN(states);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Taxes de California (ejemplos)
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

-- Zonas de envío de ejemplo
INSERT INTO shipping_zones (name, states, zip_prefixes, base_cost, cost_per_lb, free_threshold, is_active) VALUES
('California Local', ARRAY['CA'], ARRAY['90','91','92','93','94'], 5.00, 0.50, 50.00, true),
('West Coast', ARRAY['CA','OR','WA','NV','AZ'], ARRAY[''], 8.00, 0.75, 75.00, true),
('Texas & Southwest', ARRAY['TX','NM','CO','UT'], ARRAY[''], 10.00, 0.90, 100.00, true),
('East Coast', ARRAY['NY','NJ','FL','PA','MA','CT','MD','VA','NC','SC','GA'], ARRAY[''], 12.00, 1.00, 100.00, true),
('Midwest', ARRAY['IL','OH','MI','IN','WI','MN','IA','MO','KS','NE'], ARRAY[''], 11.00, 0.95, 100.00, true),
('Rest of USA', ARRAY[''], ARRAY[''], 15.00, 1.25, 100.00, true)
ON CONFLICT DO NOTHING;

-- Configuración inicial de la tienda (vacía, llenar desde admin)
INSERT INTO store_settings (store_name) VALUES ('MAX VENTAS')
ON CONFLICT DO NOTHING;
