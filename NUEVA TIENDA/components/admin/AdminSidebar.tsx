'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Percent,
  Settings,
  LogOut,
} from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Productos', icon: Package },
  { href: '/orders', label: 'Órdenes', icon: ShoppingCart },
  { href: '/shipping', label: 'Envíos', icon: Truck },
  { href: '/taxes', label: 'Taxes', icon: Percent },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r z-50 flex flex-col">
      <div className="p-5 border-b flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#e7ddcd] flex-shrink-0 bg-[#2b241c]">
          <img src="/Logotipo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#2b241c] leading-tight">MAX VENTAS</h1>
          <p className="text-[11px] text-[#8a7d6c]">Panel de Administración</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition relative ${
                isActive ? 'text-black font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gray-100 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon className="w-4 h-4" />
                {link.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_auth');
            window.location.href = '/dashboard';
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 transition w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
