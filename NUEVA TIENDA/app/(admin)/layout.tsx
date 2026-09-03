'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import '../globals.css';

const PIN = process.env.NEXT_PUBLIC_ACCESS_PIN || '1234';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth');
    if (saved === 'true') setAuthenticated(true);
  }, []);

  const handleLogin = () => {
    if (pinInput === PIN) {
      setAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
    } else {
      alert('PIN incorrecto');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f1e8] p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-[#e7ddcd] max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-[#e7ddcd] mx-auto bg-[#2b241c] shadow-md p-1">
            <img src="/Logotipo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#2b241c]">MAX VENTAS</h1>
            <p className="text-xs text-[#8a7d6c]">Panel de Administración</p>
          </div>
          <p className="text-xs text-gray-500">
            Ingresa tu PIN de 4 dígitos para acceder
          </p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="••••"
            className="w-full px-4 py-3 border border-[#e7ddcd] rounded-xl text-center text-2xl tracking-[0.3em] font-mono outline-none focus:border-[#b8935a] bg-[#f7f1e8]/40"
            maxLength={6}
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full bg-[#b8935a] hover:bg-[#9c7a45] text-white py-3.5 rounded-xl font-bold transition shadow-md"
          >
            Ingresar al Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <main className="flex-1 p-8 ml-64">{children}</main>
    </div>
  );
}
