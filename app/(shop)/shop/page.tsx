'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { Sparkles, Search, PackageX } from 'lucide-react';

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  useEffect(() => {
    async function loadProducts() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*, product_variants(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = data.map((p: any) => {
            const rawPrice = p.price ?? p.precio ?? p.price_usd ?? p.unit_price ?? p.product_variants?.[0]?.precio ?? (p.cost ? p.cost * 2 : 0);
            const numPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice) || 0;
            return {
              ...p,
              name: p.name || p.title || 'Prenda Exclusiva',
              price: numPrice,
              slug: p.slug || p.id,
            };
          });
          setProducts(mapped);
        }
      } catch (e) {
        console.warn('Error cargando productos:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Extraer categorías únicas
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filtrado y ordenamiento en memoria ultra-rápido (0ms)
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const name = (p.name || p.title || '').toLowerCase();
        const matchesSearch = name.includes(search.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
        return 0; // newest / default
      });
  }, [products, search, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-[#f7f1e8]/30 pb-20">
      {/* Header del Catálogo */}
      <div className="bg-white border-b border-[#e7ddcd]/70 py-10 px-4">
        <div className="max-w-7xl mx-auto text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f7f1e8] border border-[#e7ddcd] text-[#b8935a] text-xs font-bold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" /> Colección Disponible
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2b241c] tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-xs sm:text-sm text-[#8a7d6c] max-w-md mx-auto">
            Explora nuestras prendas exclusivas con envíos rápidos a todo Estados Unidos.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Barra de Filtros, Categorías y Búsqueda */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e7ddcd] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Categorías (Chips) */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                selectedCategory === 'all'
                  ? 'bg-[#b8935a] text-white shadow-sm'
                  : 'bg-[#f7f1e8] text-[#2b241c] hover:bg-[#efe4d6]'
              }`}
            >
              Todos ({products.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedCategory === cat
                    ? 'bg-[#b8935a] text-white shadow-sm'
                    : 'bg-[#f7f1e8] text-[#2b241c] hover:bg-[#efe4d6]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Búsqueda y Ordenamiento */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar prenda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#e7ddcd] rounded-xl text-xs outline-none focus:border-[#b8935a] bg-[#f7f1e8]/40"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-[#e7ddcd] rounded-xl text-xs bg-white text-[#2b241c] outline-none font-medium cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </div>
        </div>

        {/* Grilla de Productos */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white p-3 rounded-2xl border border-[#e7ddcd] space-y-3">
                <div className="aspect-square bg-[#f7f1e8] rounded-xl" />
                <div className="h-4 bg-[#f7f1e8] rounded-md w-3/4" />
                <div className="h-4 bg-[#f7f1e8] rounded-md w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#e7ddcd] rounded-3xl p-16 text-center space-y-3">
            <PackageX className="w-12 h-12 text-[#8a7d6c] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[#2b241c]">No encontramos productos</h3>
            <p className="text-xs text-[#8a7d6c]">
              Intenta con otro término de búsqueda o selecciona otra categoría.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="mt-2 inline-block text-xs font-bold text-[#b8935a] hover:underline"
            >
              Ver todos los productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
