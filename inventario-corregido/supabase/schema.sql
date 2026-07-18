-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y correr

create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cost numeric default 0,
  talla_mode text check (talla_mode in ('global','multiple')) default 'global',
  talla_global text,
  talla_values text[],
  color_mode text check (color_mode in ('global','multiple')) default 'global',
  color_global text,
  color_values text[],
  material_mode text check (material_mode in ('global','multiple')) default 'global',
  material_global text,
  material_values text[],
  images text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  talla text,
  color text,
  material text,
  sku text,
  stock int default 0,
  shopify_stock int default 0,
  precio numeric default 0
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  channel text check (channel in ('Shopify', 'Persona', 'Instagram', 'WhatsApp')) default 'Shopify',
  status text check (status in ('Apartado', 'Vendido')) default 'Vendido',
  quantity int default 1,
  total_price numeric default 0,
  total_cost numeric default 0,
  client_info text, -- Opcional, nombre de cliente o detalles de reserva
  created_at timestamptz default now()
);

-- Habilitar RLS pero con política abierta (protegido por el PIN a nivel de app)
alter table products enable row level security;
alter table product_variants enable row level security;
alter table sales enable row level security;

create policy "public read/write products" on products
  for all using (true) with check (true);

create policy "public read/write variants" on product_variants
  for all using (true) with check (true);

create policy "public read/write sales" on sales
  for all using (true) with check (true);

-- Storage: crear manualmente un bucket público llamado "product-images"
