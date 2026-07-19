-- Ejecutar en Supabase: SQL Editor -> New query -> pegar y correr
-- Este script es seguro de correr varias veces (usa IF NOT EXISTS / DROP IF EXISTS)

-- 1) Tabla de clientes
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  phone text,
  country_code text default '+58',
  created_at timestamptz default now()
);

alter table clients enable row level security;
drop policy if exists "public read/write clients" on clients;
create policy "public read/write clients" on clients for all using (true) with check (true);

-- 2) Relacionar ventas con clientes
alter table sales add column if not exists client_id uuid references clients(id);

-- 3) Re-asegurar políticas de las tablas existentes (por si no se aplicaron antes)
drop policy if exists "public read/write products" on products;
create policy "public read/write products" on products for all using (true) with check (true);

drop policy if exists "public read/write variants" on product_variants;
create policy "public read/write variants" on product_variants for all using (true) with check (true);

drop policy if exists "public read/write sales" on sales;
create policy "public read/write sales" on sales for all using (true) with check (true);

-- 4) IMPORTANTE: políticas de Storage para poder subir fotos
-- (esto es lo que causaba "error subiendo foto")
drop policy if exists "public insert product-images" on storage.objects;
create policy "public insert product-images" on storage.objects
  for insert to public with check (bucket_id = 'product-images');

drop policy if exists "public select product-images" on storage.objects;
create policy "public select product-images" on storage.objects
  for select to public using (bucket_id = 'product-images');

drop policy if exists "public update product-images" on storage.objects;
create policy "public update product-images" on storage.objects
  for update to public using (bucket_id = 'product-images');

drop policy if exists "public delete product-images" on storage.objects;
create policy "public delete product-images" on storage.objects
  for delete to public using (bucket_id = 'product-images');
