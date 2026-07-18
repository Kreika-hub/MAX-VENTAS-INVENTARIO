# Inventario — guía de despliegue

## 1. Supabase
1. Crea un proyecto en supabase.com (o usa uno existente).
2. Ve a SQL Editor -> New query, pega el contenido de `supabase/schema.sql` y ejecútalo.
3. Ve a Storage -> New bucket -> nómbralo `product-images` -> actívalo como **Public bucket**.
4. Ve a Project Settings -> API y copia:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Variables de entorno
Copia `.env.local.example` a `.env.local` y llena los 3 valores
(incluyendo el `NEXT_PUBLIC_ACCESS_PIN` que quieras usar como código de
acceso del equipo).

## 3. Subir a GitHub
```bash
cd inventario-app
git init
git add .
git commit -m "Inventario inicial con Supabase"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/inventario-tienda.git
git push -u origin main
```
Verifica en GitHub que el commit realmente llegó (revisa el repo en el
navegador) antes de continuar al paso 4.

## 4. Desplegar en Vercel
1. Entra a vercel.com -> Add New Project -> importa el repo `inventario-tienda`.
2. En "Environment Variables" agrega las mismas 3 variables del `.env.local`.
3. Deploy.
4. Cuando termine, abre la URL que te da Vercel desde tu teléfono y
   verifica que pida el código de acceso y que puedas crear un producto
   de prueba.

## 5. Probar multi-teléfono
Abre la URL desde dos teléfonos distintos, agrega un producto en uno y
confirma que aparece en el otro al refrescar — eso confirma que la
persistencia en Supabase está funcionando.

## Notas
- Los íconos `icon-192.png` / `icon-512.png` referenciados en
  `public/manifest.json` no están incluidos — agrégalos (puede ser el
  logo de la tienda) para que la app se vea bien al instalarla en el
  iPhone.
- El PIN de acceso es simple (no es autenticación real) — suficiente
  para un solo cliente/equipo interno, pero no lo compartas fuera del
  equipo.
