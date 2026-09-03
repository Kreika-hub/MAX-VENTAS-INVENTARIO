'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Truck } from 'lucide-react';

interface HeroProps {
  bannerPcUrl?: string | null;
  bannerMobileUrl?: string | null;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
}

export function Hero({
  bannerPcUrl,
  bannerMobileUrl,
  title = 'MAX VENTAS',
  subtitle = 'Descubre nuestra selección de productos de calidad. Envíos a todo Estados Unidos.',
  buttonText = 'Ver Catálogo →',
  buttonLink = '/shop',
}: HeroProps) {
  const pcImage = bannerPcUrl || '/bannerpc.jfif';
  const mobileImage = bannerMobileUrl || '/bannermovile.jfif';

  return (
    <div className="w-full bg-[#f7f1e8]/30">
      {/* ========================================================================= */}
      {/* 1. VERSIÓN DESKTOP (Computadoras y Pantallas Grandes)                    */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative w-full overflow-hidden group">
        <Link href={buttonLink} className="block relative w-full aspect-[2.4/1] max-h-[520px]">
          <Image
            src={pcImage}
            alt="Banner Colección MAX VENTAS"
            fill
            priority
            className="object-contain object-center group-hover:scale-[1.008] transition-transform duration-500 ease-out"
          />

          {/* Botón flotante limpio y sutil en la esquina inferior izquierda (SIN cuadro de logo) */}
          <div className="absolute bottom-6 left-8 z-20">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="bg-white/95 backdrop-blur-md border border-[#e7ddcd] py-3 px-5 rounded-2xl shadow-xl flex items-center gap-4 hover:shadow-2xl transition"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#b8935a] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#b8935a]" /> Nueva Colección
                </p>
                <p className="text-sm font-extrabold text-[#2b241c]">Raíces de Mi Tierra</p>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-[#b8935a] text-white text-xs font-bold px-4 py-2.5 rounded-xl group-hover:bg-[#9c7a45] transition shadow-sm">
                {buttonText} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </motion.div>
          </div>
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* 2. VERSIÓN MÓVIL (Teléfonos Celulares)                                    */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        {/* Banner 100% visible sin recortes */}
        <Link href={buttonLink} className="block relative w-full aspect-[4/5] sm:aspect-[1/1] overflow-hidden bg-[#efe4d6]">
          <Image
            src={mobileImage}
            alt="Banner Móvil MAX VENTAS"
            fill
            priority
            className="object-contain object-center"
          />
        </Link>

        {/* Bloque limpio debajo de la imagen */}
        <div className="bg-[#f7f1e8] border-b border-[#e7ddcd] px-5 py-5 text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white border border-[#e7ddcd] text-[#b8935a] text-[11px] font-bold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-[#b8935a]" /> Colección Raíces de Mi Tierra
          </div>

          <p className="text-xs text-[#8a7d6c] font-medium max-w-xs mx-auto">
            {subtitle}
          </p>

          <div>
            <Link
              href={buttonLink}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#b8935a] text-white py-3.5 px-6 rounded-2xl font-bold text-sm hover:bg-[#9c7a45] active:scale-[0.98] transition shadow-md"
            >
              {buttonText} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-[11px] text-[#8a7d6c] flex items-center justify-center gap-1 font-medium">
            <Truck className="w-3.5 h-3.5 text-[#b8935a]" /> Envíos rápidos y seguros a todo USA
          </p>
        </div>
      </div>
    </div>
  );
}
