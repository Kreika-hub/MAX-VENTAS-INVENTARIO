'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { ProductCard } from '@/components/shop/ProductCard';
import { Sparkles, Search, SlidersHorizontal, PackageX } from 'lucide-react';
import Link from 'next/link';

// Productos de muestra iniciales ultra-rápidos (por si la DB aún no tiene registros)
const SAMPLE_PRODUCTS = [
  {
    id: 'demo-1',
    name: 'Franela Venezuela Raíces Floral',
    slug: 'franela-venezuela-raices-floral',
    price: 35.00,
    cost: 12.00,
    stock: 25,
    weight: 0.8,
    category: 'Franelas',
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&q=80'],
    is_active: true,
  },
  {
    id: 'demo-2',
    name: 'Crop Top Venezuela Vintage 1980',
    slug: 'crop-top-venezuela-vintage',
    price: 28.00,
    cost: 10.00,
    stock: 18,
    weight: 0.6,
    category: 'Tops',
    images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&q=80'],
    is_active: true,
  },
  {
    id: 'demo-3',
    name: 'Camiseta Estampada Guacamaya Tricolor',
    slug: 'camiseta-estampada-guacamaya',
    price: 32.00,
    cost: 11.00,
    stock: 30,
    weight: 0.8,
    category: 'Franelas',
    images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80'],
    is_active: true,
  },
  {
    id: 'demo-4',
    name: 'Gorra Clásica Bordada Vino Tinto',
    slug: 'gorra-clasica-bordada',
    price: 24.50,
    cost: 8.00,
    stock: 15,
    weight: 0.5,
    category: 'Accesorios',
    images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80'],
    is_active: true,
  },
];

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>(SAMPLE_PRODUCTS);
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
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setProducts(data);
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
        {filteredProducts.length === 0 ? (
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
