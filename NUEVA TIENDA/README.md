# 🛒 MAX-VENTAS — Tienda Shopify-Style

> Proyecto completo de e-commerce con panel de admin + tienda pública, pagos manuales (Zelle/Transferencia), cálculo de taxes USA, envíos por zona, y facturación.

---

## 📋 Índice

1. [Arquitectura](#arquitectura)
2. [Requisitos](#requisitos)
3. [Instalación Local](#instalación-local)
4. [Configuración de Supabase](#configuración-de-supabase)
5. [Base de Datos](#base-de-datos)
6. [Módulos](#módulos)
   - [Panel de Admin](#panel-de-admin)
   - [Tienda Pública](#tienda-pública)
   - [Carrito](#carrito)
   - [Checkout](#checkout)
   - [Pagos Manuales](#pagos-manuales)
   - [Facturación](#facturación)
7. [Taxes USA](#taxes-usa)
8. [Envíos](#envíos)
9. [Pirate Ship](#pirate-ship)
10. [Despliegue](#despliegue)
11. [Roadmap](#roadmap)

---

## 🏗️ Arquitectura

```
┌─────────────────┐     Supabase      ┌─────────────────┐
│   🔒 ADMIN      │◄────PostgreSQL───►│   🛒 TIENDA     │
│  (Inventario)   │    + Storage      │   (Landing)     │
│  Órdenes        │    + Edge Fn      │   Catálogo      │
│  Envíos         │                   │   Carrito       │
│  Taxes          │                   │   Checkout      │
│  Config         │                   │   Factura       │
└─────────────────┘                   └─────────────────┘
```

**Tecnologías:**
- **Frontend:** Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage + Edge Functions)
- **Estado:** Zustand (carrito)
- **Animaciones:** Framer Motion
- **PDF:** jsPDF / html2canvas

---

## 📦 Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis) — para desplegar

---

## 🚀 Instalación Local

```bash
# 1. Descomprime este ZIP
cd max-ventas-shop

# 2. Instala dependencias
npm install

# 3. Copia variables de entorno
cp .env.local.example .env.local

# 4. Edita .env.local con tus credenciales de Supabase
#    (ver sección "Configuración de Supabase")

# 5. Corre en local
npm run dev
# Abre http://localhost:3000
```

---

## ⚙️ Configuración de Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto nuevo.
2. Ve a **SQL Editor → New query**.
3. Pega el contenido de `supabase/schema.sql` y ejecútalo.
4. Ve a **Storage → New bucket**:
   - Nombre: `product-images`
   - Actívalo como **Public bucket**
5. Ve a **Project Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Pega esos valores en tu `.env.local`.

---

## 🗄️ Base de Datos

El archivo `supabase/schema.sql` crea:

| Tabla | Propósito |
|-------|-----------|
| `products` | Inventario (ya existente) |
| `shipping_zones` | Zonas de envío configurables |
| `tax_rates` | Tasas de impuesto por estado/ciudad/ZIP |
| `orders` | Órdenes de compra |
| `order_items` | Items dentro de cada orden |
| `store_settings` | Configuración de la tienda (banco, Zelle, logo) |

### Taxes — California (incluido)

California tiene tasa estatal base de **7.25%**, pero con tasas locales combinadas llega hasta **10.75%**.

El schema incluye:
- Tasa default estatal (`7.25%`)
- Ciudades principales: LA, SF, San Diego, Santa Monica, Oakland

Para todos los estados USA, puedes:
1. **Opción A:** Precargar manualmente en `tax_rates`
2. **Opción B:** Integrar API de TaxJar/Avalara (ver docs/taxes.md)

---

## 🧩 Módulos

### 🔒 Panel de Admin (`/admin/*`)

Rutas protegidas con PIN de acceso (`NEXT_PUBLIC_ACCESS_PIN`).

| Ruta | Función |
|------|---------|
| `/admin/dashboard` | Resumen de ventas, órdenes recientes |
| `/admin/products` | Gestión de inventario (ya existente) |
| `/admin/orders` | Ver órdenes, cambiar estado, agregar tracking |
| `/admin/shipping` | Configurar zonas de envío |
| `/admin/taxes` | Configurar tasas de impuesto |
| `/admin/settings` | Datos bancarios, Zelle, logo, color |

### 🛒 Tienda Pública (`/*`)

| Ruta | Función |
|------|---------|
| `/` | Landing page con productos destacados |
| `/shop` | Catálogo completo con filtros |
| `/product/[slug]` | Página de producto individual |
| `/checkout` | Checkout con dirección, tax, envío |
| `/order/[id]` | Comprobante de compra / Factura |

### 🛍️ Carrito

- Drawer lateral animado (Framer Motion)
- Agregar / quitar / cambiar cantidad
- Persistencia en `localStorage` (Zustand)
- Badge animado en el navbar

### 📍 Checkout

1. Cliente ingresa dirección + ZIP
2. Sistema calcula:
   - **Tax:** según estado/ciudad/ZIP (Edge Function)
   - **Envío:** según zona configurada en admin
3. Muestra desglose: Subtotal + Tax + Envío = **Total**

### 💳 Pagos Manuales

**No hay pasarela de pago integrada.** El cliente:
1. Ve los datos de tu banco / Zelle en el checkout
2. Copia y pega fácilmente (botón "Copiar")
3. Realiza la transferencia manualmente
4. Tú confirmas el pago desde el panel admin

### 📄 Facturación

- Cada orden genera un número único: `MAX-000001`, `MAX-000002`, etc.
- Página pública `/order/[id]` con:
  - Datos del cliente y dirección
  - Lista de productos con precios
  - Desglose: subtotal, tax, envío, total
  - Número de seguimiento (cuando se agregue)
- Botón "Imprimir / Guardar PDF"

---

## 🚚 Pirate Ship

**Pirate Ship NO tiene API pública.** No se puede integrar automáticamente.

**Flujo recomendado:**
1. Cliente paga → Orden aparece en admin como "Pagada"
2. En admin, filtras órdenes pagadas → Click **"Exportar CSV para Pirate Ship"**
3. Subes CSV a Pirate Ship → Compras labels
4. Copias tracking numbers de vuelta al admin
5. Cliente recibe email con tracking automáticamente

---

## 🌍 Despliegue

### Vercel (Recomendado)

1. Sube este proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) → Add New Project
3. Importa el repo
4. Agrega las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, etc.)
5. Deploy

### Otras plataformas

Este proyecto usa Next.js App Router. Cualquier plataforma que soporte Next.js funciona:
- Netlify
- Railway
- Render
- O tu propio VPS

---

## 🗺️ Roadmap

| Fase | Qué hacer | Tiempo |
|------|-----------|--------|
| 1 | Fundación: DB, envíos, taxes | 1 día |
| 2 | Tienda pública: landing, catálogo | 2-3 días |
| 3 | Carrito: Zustand + drawer | 1-2 días |
| 4 | Checkout: dirección + cálculos | 2 días |
| 5 | Pagos: Zelle/Transferencia | 1 día |
| 6 | Órdenes: crear + comprobante | 1-2 días |
| 7 | Admin de órdenes + tracking | 1-2 días |
| 8 | Factura PDF | 1 día |
| 9 | Polish: animaciones, responsive | 2 días |

**Total estimado: ~2 semanas**

---

## 📁 Estructura de Archivos

```
max-ventas-shop/
├── app/
│   ├── (admin)/          ← Panel admin
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── shipping/page.tsx
│   │   ├── taxes/page.tsx
│   │   └── settings/page.tsx
│   ├── (shop)/           ← Tienda pública
│   │   ├── layout.tsx
│   │   ├── page.tsx      ← Landing
│   │   ├── shop/page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── order/[id]/page.tsx
│   └── api/              ← API routes
│       ├── calculate-tax/route.ts
│       └── calculate-shipping/route.ts
├── components/
│   ├── shop/             ← CartDrawer, ProductCard, etc.
│   ├── admin/            ← Tablas, forms admin
│   └── ui/               ← Botones, inputs
├── stores/
│   └── cart.ts           ← Zustand store
├── lib/
│   ├── supabase.ts       ← Cliente Supabase
│   └── utils.ts          ← Helpers
├── types/
│   └── index.ts          ← Tipos TypeScript
├── supabase/
│   └── schema.sql        ← Schema completo
├── docs/
│   └── taxes.md          ← Guía de taxes USA
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🆘 Soporte

Si tienes dudas durante la implementación, revisa:
- `docs/taxes.md` — Guía detallada de taxes USA
- Los comentarios en cada componente
- El schema SQL tiene comentarios explicativos

---

**Hecho con ❤️ para MAX-VENTAS**
