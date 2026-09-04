'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useCart } from '@/stores/cart';
import { formatPrice } from '@/lib/utils';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/types';

interface ProductCardProps {
  product: Product | any;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const displayName = product.name || product.title || 'Prenda Exclusiva';
  const firstImage = Array.isArray(product.images) && product.images[0] ? product.images[0] : '';
  
  const rawPrice = product.price ?? product.precio ?? product.price_usd ?? product.unit_price ?? product.product_variants?.[0]?.precio ?? (product.cost ? product.cost * 2 : 0);
  const numPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice) || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: displayName,
      price: numPrice,
      quantity: 1,
      image: firstImage,
      weight: product.weight || 1,
    });
    openCart();
  };

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -5 }}
      className="group bg-white rounded-2xl border border-[#e7ddcd]/70 p-2.5 shadow-[0_2px_10px_rgba(43,36,28,0.03)] hover:shadow-md hover:border-[#b8935a]/50 transition-all duration-300 flex flex-col justify-between"
    >
      <Link href={productUrl} className="block">
        <div className="relative w-full aspect-square bg-[#f7f1e8] rounded-xl overflow-hidden mb-2.5 border border-[#e7ddcd]/40 flex items-center justify-center">
          {firstImage ? (
            <Image
              src={firstImage}
              alt={displayName}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-[#8a7d6c]">
              Sin imagen
            </div>
          )}

          {/* Botón flotante para agregar rápido al carrito */}
          <button
            onClick={handleAddToCart}
            title="Agregar al carrito"
            className="absolute bottom-2.5 right-2.5 bg-white text-[#2b241c] hover:bg-[#b8935a] hover:text-white p-2.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 border border-[#e7ddcd]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="px-1 py-1 space-y-0.5">
          <h3 className="font-semibold text-xs text-[#2b241c] truncate group-hover:text-[#b8935a] transition">
            {displayName}
          </h3>
          <p className="text-sm font-extrabold text-[#b8935a]">
            {formatPrice(numPrice)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
