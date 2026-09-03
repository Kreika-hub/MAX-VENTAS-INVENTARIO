'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCart } from '@/stores/cart';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export function Navbar() {
  const { totalItems, openCart } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const count = mounted ? totalItems() : 0;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#e7ddcd]/70 shadow-[0_2px_15px_rgba(43,36,28,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Logotipo de la marca sobre la barra blanca */}
        <Link href="/" className="flex items-center group py-2">
          <div className="relative h-12 w-48 sm:w-56 flex items-center">
            <Image
              src="/Logotipo.png"
              alt="MAX VENTAS"
              fill
              priority
              className="object-contain object-left group-hover:opacity-90 transition duration-150"
            />
          </div>
        </Link>

        {/* Links de navegación escritorio */}
        <div className="hidden md:flex items-center gap-10 font-semibold text-sm text-[#2b241c]">
          <Link
            href="/"
            className="hover:text-[#b8935a] transition duration-150"
          >
            Inicio
          </Link>
          <Link
            href="/shop"
            className="hover:text-[#b8935a] transition duration-150"
          >
            Catálogo
          </Link>
          <Link
            href="/checkout"
            className="hover:text-[#b8935a] transition duration-150"
          >
            Checkout
          </Link>
        </div>

        {/* Carrito + Menú móvil */}
        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            aria-label="Abrir carrito"
            className="relative p-2.5 hover:bg-[#f7f1e8] text-[#2b241c] rounded-full transition duration-150 border border-transparent hover:border-[#e7ddcd]"
          >
            <ShoppingBag className="w-5 h-5 text-[#2b241c]" />
            {mounted && count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 bg-[#b8935a] text-white text-[11px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#2b241c] hover:bg-[#f7f1e8] rounded-xl"
            aria-label="Menú"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú desplegable Móvil */}
      {mobileOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden border-t border-[#e7ddcd] bg-[#f7f1e8]/98 backdrop-blur-md px-6 py-6 space-y-4 shadow-xl text-[#2b241c]"
        >
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-bold hover:text-[#b8935a]"
          >
            Inicio
          </Link>
          <Link
            href="/shop"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-bold hover:text-[#b8935a]"
          >
            Catálogo de Productos
          </Link>
          <Link
            href="/checkout"
            onClick={() => setMobileOpen(false)}
            className="block text-base font-bold hover:text-[#b8935a]"
          >
            Finalizar Compra (Checkout)
          </Link>
        </motion.div>
      )}
    </nav>
  );
}
