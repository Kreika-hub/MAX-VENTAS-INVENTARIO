import { createServerClient } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { Hero } from '@/components/shop/Hero';
import { resolvePrice } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let products: any[] = [];
  let settings: any = null;

  try {
    const supabase = createServerClient();
    const [productsRes, settingsRes] = await Promise.allSettled([
      supabase
        .from('products')
        .select('*, product_variants(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('store_settings')
        .select('*')
        .single(),
    ]);

    if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
      products = productsRes.value.data.map((p: any) => ({
        ...p,
        name: p.name || p.title || 'Prenda Exclusiva',
        price: resolvePrice(p),
        slug: p.slug || p.id,
      }));
    }
    if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
      settings = settingsRes.value.data;
    }
  } catch (err) {
    console.error('Error fetching data on HomePage:', err);
  }

  return (
    <div>
      <Hero
        bannerPcUrl={settings?.banner_pc_url}
        bannerMobileUrl={settings?.banner_mobile_url}
        title={settings?.banner_title || settings?.store_name || 'MAX VENTAS'}
        subtitle={settings?.banner_subtitle || 'Descubre nuestra selección de productos de calidad. Envíos a todo Estados Unidos.'}
        buttonText={settings?.banner_button_text || 'Ver Catálogo →'}
        buttonLink={settings?.banner_button_link || '/shop'}
      />

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#2b241c]">Productos Destacados</h2>
            <p className="text-xs sm:text-sm text-[#8a7d6c]">Lo más vendido de nuestra tienda</p>
          </div>
          <Link
            href="/shop"
            className="text-xs sm:text-sm font-bold text-[#b8935a] hover:underline flex items-center gap-1"
          >
            Ver todo el catálogo →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-[#f7f1e8]/50 border border-dashed border-[#e7ddcd] rounded-3xl p-12 text-center text-[#8a7d6c]">
            <p className="font-bold text-sm text-[#2b241c] mb-1">No hay productos destacados activos.</p>
            <p className="text-xs">Puedes publicar productos desde el Panel de Administración.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
