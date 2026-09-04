'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCart } from '@/stores/cart';
import { formatPrice, resolvePrice } from '@/lib/utils';
import { Minus, Plus, ShoppingBag, ArrowLeft, Truck } from 'lucide-react';
import Image from 'next/image';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { addItem, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchProduct() {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        // 1. Intentar buscar por slug exacto
        let { data, error } = await supabase
          .from('products')
          .select('*, product_variants(*)')
          .eq('slug', params.slug)
          .maybeSingle();

        // 2. Si no encuentra por slug, buscar por ID o coincidencia parcial
        if (!data) {
          const possibleId = params.slug.includes('--') 
            ? params.slug.split('--').pop() 
            : params.slug;
            
          const res = await supabase
            .from('products')
            .select('*, product_variants(*)')
            .or(`id.eq.${possibleId},slug.ilike.%${params.slug}%`)
            .limit(1)
            .maybeSingle();
            
          data = res.data;
        }

        if (isMounted && data) {
          setProduct({
            ...data,
            name: data.name || data.title || 'Prenda Exclusiva',
            price: resolvePrice(data),
            images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [],
          });
        }
      } catch (err) {
        console.error('Error cargando detalle de producto:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProduct();
    return () => { isMounted = false; };
  }, [params.slug]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0] || '',
      weight: product.weight || 1,
    });
    openCart();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="animate-pulse space-y-4 max-w-md mx-auto">
          <div className="bg-[#f7f1e8] h-96 rounded-3xl border border-[#e7ddcd]" />
          <div className="bg-[#f7f1e8] h-8 w-3/4 mx-auto rounded-xl" />
          <div className="bg-[#f7f1e8] h-4 w-1/2 mx-auto rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#2b241c]">Producto no encontrado</h1>
        <p className="text-xs text-[#8a7d6c]">Es posible que esta prenda haya sido removida o cambiado de enlace.</p>
        <div>
          <button 
            onClick={() => router.push('/shop')} 
            className="bg-[#b8935a] hover:bg-[#9c7a45] text-white px-6 py-3 rounded-2xl font-bold text-xs transition"
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  const firstImage = product.images?.[0] || '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <button
        onClick={() => router.push('/shop')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#8a7d6c] hover:text-[#2b241c] mb-8 transition py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al Catálogo
      </button>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-14 items-start">
        {/* Contenedor de Imagen con clases estáticas relativas y dimensiones fijas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full flex justify-center"
        >
          <div className="relative w-full max-w-md aspect-square bg-[#f7f1e8] rounded-3xl overflow-hidden border border-[#e7ddcd] shadow-sm flex items-center justify-center">
            {firstImage ? (
              <Image 
                src={firstImage} 
                alt={product.name} 
                fill 
                className="object-cover" 
                priority 
                sizes="(max-width: 768px) 100vw, 500px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#8a7d6c]">
                Sin imagen disponible
              </div>
            )}
          </div>
        </motion.div>

        {/* Información del Producto */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }} 
          className="space-y-6"
        >
          <div className="space-y-2">
            {product.category && (
              <span className="inline-block text-[11px] font-bold text-[#b8935a] uppercase tracking-wider bg-[#f7f1e8] px-3 py-1 rounded-full border border-[#e7ddcd]">
                {product.category}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2b241c] leading-tight">
              {product.name}
            </h1>
            <p className="text-2xl font-black text-[#b8935a]">
              {formatPrice(product.price)}
            </p>
          </div>

          {product.description && (
            <div className="text-xs sm:text-sm text-[#8a7d6c] leading-relaxed border-t border-b border-[#e7ddcd]/70 py-4">
              <p>{product.description}</p>
            </div>
          )}

          <div className="flex items-center gap-2.5 text-xs text-[#8a7d6c] font-medium bg-[#f7f1e8]/60 p-3 rounded-2xl border border-[#e7ddcd]">
            <Truck className="w-4 h-4 text-[#b8935a] flex-shrink-0" />
            <span>Envíos rápidos a todo Estados Unidos · Calculado en el checkout</span>
          </div>

          {product.stock <= 5 && product.stock > 0 && (
            <p className="text-xs text-orange-600 font-bold flex items-center gap-1.5">
              ⚡ ¡Solo quedan {product.stock} unidades disponibles!
            </p>
          )}
          {product.stock === 0 && (
            <p className="text-xs text-red-600 font-bold">
              ❌ Agotado temporalmente
            </p>
          )}

          {/* Selector de Cantidad y Botón de Compra */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <div className="flex items-center justify-between border border-[#e7ddcd] rounded-2xl bg-[#f7f1e8]/40 p-1 w-full sm:w-36">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center hover:bg-gray-100 text-[#2b241c] transition border border-[#e7ddcd]/50 shadow-sm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-extrabold text-sm text-[#2b241c] px-3">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))} 
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center hover:bg-gray-100 text-[#2b241c] transition border border-[#e7ddcd]/50 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <motion.button 
              whileTap={{ scale: 0.98 }} 
              onClick={handleAddToCart} 
              disabled={product.stock === 0}
              className="flex-1 bg-[#b8935a] hover:bg-[#9c7a45] text-white py-4 px-8 rounded-2xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              {product.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
