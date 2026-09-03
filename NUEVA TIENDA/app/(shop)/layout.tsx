import { ReactNode } from 'react';
import { Navbar } from '@/components/shop/Navbar';
import { CartDrawer } from '@/components/shop/CartDrawer';
import '../globals.css';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16">{children}</main>
      <CartDrawer />
    </div>
  );
}
