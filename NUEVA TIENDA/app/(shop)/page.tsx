import { createServerClient } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { Hero } from '@/components/shop/Hero';
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
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('store_settings')
        .select('*')
        .single(),
    ]);

    if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
      products = productsRes.value.data;
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
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Productos Destacados</h2>
            <p className="text-sm text-gray-500">Lo más vendido de nuestra tienda</p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-semibold hover:underline flex items-center gap-1"
          >
            Ver todo el catálogo →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-gray-50 border border-dashed rounded-2xl p-12 text-center text-gray-500">
            <p className="font-medium text-gray-700 mb-1">No hay productos destacados activos.</p>
            <p className="text-sm">Puedes publicar productos desde el Panel de Administración.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
