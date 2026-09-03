'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/stores/cart';
import { useRouter } from 'next/navigation';
import { X, Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, totalItems } = useCart();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col border-l border-[#e7ddcd]"
          >
            <div className="p-5 border-b border-[#e7ddcd] flex items-center justify-between bg-[#f7f1e8]/50">
              <h2 className="text-base font-bold text-[#2b241c]">
                🛒 Tu Carrito ({totalItems()})
              </h2>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-[#e7ddcd]/50 rounded-full text-[#2b241c] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[#8a7d6c] py-16 space-y-2"
                  >
                    <p className="text-2xl">🛍️</p>
                    <p className="font-semibold text-sm">Tu carrito está vacío</p>
                    <p className="text-xs">Descubre nuestra colección y agrega tus prendas favoritas.</p>
                  </motion.div>
                ) : (
                  items.map((item) => (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -80, scale: 0.9 }}
                      className="flex gap-3.5 p-3 bg-[#f7f1e8]/60 border border-[#e7ddcd] rounded-2xl"
                    >
                      <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 relative border border-[#e7ddcd]">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#8a7d6c] text-[10px]">Sin foto</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs text-[#2b241c] truncate">{item.name}</h3>
                        <p className="text-[#b8935a] font-bold text-xs mt-0.5">{formatPrice(item.price)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#e7ddcd] flex items-center justify-center hover:bg-gray-100 text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-[#2b241c]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-[#e7ddcd] flex items-center justify-center hover:bg-gray-100 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-gray-400 hover:text-red-500 p-1 self-start transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {items.length > 0 && (
              <div className="border-t border-[#e7ddcd] p-5 space-y-3 bg-[#f7f1e8]/30">
                <div className="flex justify-between text-base font-extrabold text-[#2b241c]">
                  <span>Subtotal</span>
                  <span className="text-lg text-[#b8935a]">{formatPrice(total())}</span>
                </div>
                <button
                  onClick={() => {
                    closeCart();
                    router.push('/checkout');
                  }}
                  className="w-full bg-[#b8935a] hover:bg-[#9c7a45] text-white py-3.5 rounded-2xl transition font-bold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  Ir al Checkout <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={closeCart}
                  className="w-full text-xs text-[#8a7d6c] hover:text-[#2b241c] font-medium transition py-1 text-center"
                >
                  Seguir comprando
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
