'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Clock, 
  DollarSign, 
  Package, 
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    activeProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      const [
        totalOrdersRes,
        pendingOrdersRes,
        recentOrdersRes,
        revenueRes,
        productsRes,
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('total').eq('payment_status', 'confirmed'),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const totalRevenue = revenueRes.data?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      setStats({
        totalOrders: totalOrdersRes.count || 0,
        pendingOrders: pendingOrdersRes.count || 0,
        totalRevenue,
        activeProducts: productsRes.count || 0,
      });

      setRecentOrders(recentOrdersRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Métricas y actividad en tiempo real de tu tienda</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs bg-white border px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Órdenes</span>
            <ShoppingCart className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{stats.totalOrders}</p>
          <p className="text-[11px] text-gray-400">Registradas en el sistema</p>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-yellow-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Pendientes</span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-3xl font-extrabold text-yellow-600">{stats.pendingOrders}</p>
          <p className="text-[11px] text-yellow-700/80">Esperando pago o envío</p>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-green-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Ingresos Confirmados</span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-3xl font-extrabold text-green-600">{formatPrice(stats.totalRevenue)}</p>
          <p className="text-[11px] text-green-700/80">Pagos validados</p>
        </div>

        <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Productos Activos</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-purple-600">{stats.activeProducts}</p>
          <p className="text-[11px] text-purple-700/80">Visibles en catálogo</p>
        </div>
      </div>

      {/* Órdenes recientes */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold text-base text-gray-900">Órdenes Recientes</h2>
          <Link
            href="/orders"
            className="text-xs font-semibold text-black hover:underline inline-flex items-center gap-1"
          >
            Ver todas las órdenes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              No hay órdenes registradas aún.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">N° Orden</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">Cliente</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">Total</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">Estado</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{order.order_number}</td>
                    <td className="px-5 py-3.5 text-gray-700">{order.customer_name}</td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
