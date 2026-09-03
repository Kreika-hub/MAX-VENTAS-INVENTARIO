'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, ShoppingBag, ArrowLeft, Truck } from 'lucide-react';
import Image from 'next/image';

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { addItem, openCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    const fetchProduct = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('slug', params.slug)
        .single();
      setProduct(data);
      setLoading(false);
    };
    fetchProduct();
  });

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
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 h-96 rounded-2xl" />
          <div className="bg-gray-200 h-8 w-1/2 rounded" />
          <div className="bg-gray-200 h-4 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <button onClick={() => router.push('/shop')} className="bg-black text-white px-6 py-3 rounded-xl">
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <button
        onClick={() => router.push('/shop')}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la tienda
      </button>

      <div className="grid md:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
            {product.images?.[0] ? (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">Sin imagen</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">{product.category}</p>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
          </div>
          <div className="prose prose-sm text-gray-600"><p>{product.description}</p></div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Truck className="w-4 h-4" />
            <span>Envío calculado en el checkout</span>
          </div>
          {product.stock <= 5 && product.stock > 0 && (
            <p className="text-sm text-orange-600 font-medium">⚡ Solo quedan {product.stock} unidades</p>
          )}
          {product.stock === 0 && <p className="text-sm text-red-600 font-medium">❌ Agotado</p>}

          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center border rounded-xl">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-gray-50"><Minus className="w-4 h-4" /></button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-4 py-3 hover:bg-gray-50"><Plus className="w-4 h-4" /></button>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleAddToCart} disabled={product.stock === 0}
              className="flex-1 bg-black text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              {product.stock === 0 ? 'Agotado' : 'Agregar al carrito'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
