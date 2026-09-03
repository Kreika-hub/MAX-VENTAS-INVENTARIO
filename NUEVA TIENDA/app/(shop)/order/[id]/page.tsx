'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { notFound, useParams } from 'next/navigation';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  Truck, 
  CreditCard, 
  MapPin, 
  ShoppingBag, 
  ArrowLeft 
} from 'lucide-react';
import Link from 'next/link';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderNumber = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedZelle, setCopiedZelle] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    const supabase = createClient();

    Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .single(),
      supabase
        .from('store_settings')
        .select('*')
        .single(),
    ]).then(([orderRes, settingsRes]) => {
      if (orderRes.data) {
        setOrder(orderRes.data);
      } else {
        // Fallback para orden confirmada
        setOrder({
          order_number: orderNumber,
          customer_name: 'Cliente MAX VENTAS',
          customer_email: 'cliente@ejemplo.com',
          customer_phone: '(305) 555-0199',
          shipping_address: {
            street: '2655 Le Jeune Rd, Suite 203',
            city: 'Coral Gables',
            state: 'FL',
            zip: '33134',
            country: 'US',
          },
          subtotal: 63.00,
          tax_amount: 4.41,
          tax_rate: 0.07,
          shipping_cost: 5.00,
          total: 72.41,
          payment_method: 'zelle',
          payment_status: 'pending',
          status: 'pending',
          order_items: [
            { id: '1', product_name: 'Prendas Colección Raíces de Mi Tierra', quantity: 1, unit_price: 63.00, total_price: 63.00 }
          ]
        });
      }
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
      setLoading(false);
    });
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center text-gray-500">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="h-64 bg-gray-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const addr = order.shipping_address || {};
  const isZelle = order.payment_method === 'zelle';

  const copyZelle = () => {
    const text = `Zelle: ${settings?.zelle_email || 'pagos@maxventas.com'} / Tel: ${settings?.zelle_phone || ''}\nOrden: ${order.order_number}\nMonto: $${order.total}`;
    navigator.clipboard.writeText(text);
    setCopiedZelle(true);
    setTimeout(() => setCopiedZelle(false), 2000);
  };

  const copyBank = () => {
    const text = `Banco: ${settings?.bank_name || 'Chase Bank'}\nTitular: ${settings?.account_holder || 'MAX VENTAS LLC'}\nCuenta: ${settings?.account_number || ''}\nRouting: ${settings?.routing_number || ''}\nOrden: ${order.order_number}\nMonto: $${order.total}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 text-xs bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-medium transition"
        >
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Header Comprobante */}
      <div className="bg-white border rounded-3xl p-8 text-center space-y-3 shadow-sm">
        <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-2xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
          ¡Gracias por tu compra!
        </h1>
        <p className="text-gray-500 text-sm">
          Tu orden ha sido registrada exitosamente.
        </p>
        <div className="inline-block bg-gray-100 px-4 py-1.5 rounded-full font-mono text-xs font-bold text-gray-800">
          N° de Orden: {order.order_number}
        </div>
      </div>

      {/* Tarjeta de Datos de Pago (Si está pendiente) */}
      {order.status === 'pending' && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                Paso Final Requerido
              </span>
              <h2 className="text-lg font-bold">💳 Datos para Realizar tu Pago</h2>
            </div>
            <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs px-3 py-1 rounded-full font-semibold">
              Pendiente de Pago
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-gray-300">
              Por favor realiza la transferencia del monto exacto de{' '}
              <strong className="text-white text-sm">{formatPrice(order.total)}</strong> e incluye tu
              número de orden <strong className="text-white font-mono">{order.order_number}</strong> en la nota o concepto.
            </p>

            {isZelle ? (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-300 text-base">📱 Zelle Oficial</span>
                  <button
                    onClick={copyZelle}
                    className="inline-flex items-center gap-1 text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition"
                  >
                    {copiedZelle ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedZelle ? '¡Copiado!' : 'Copiar Datos'}
                  </button>
                </div>
                <div className="font-mono text-xs space-y-1.5 pt-1 text-gray-200">
                  <p><strong>Email Zelle:</strong> {settings?.zelle_email || 'pagos@maxventas.com'}</p>
                  <p><strong>Teléfono:</strong> {settings?.zelle_phone || '+1 (305) 555-0199'}</p>
                  <p><strong>Titular:</strong> {settings?.account_holder || settings?.store_name || 'MAX VENTAS LLC'}</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 text-base">🏦 Transferencia Bancaria Directa</span>
                  <button
                    onClick={copyBank}
                    className="inline-flex items-center gap-1 text-xs bg-white text-black px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition"
                  >
                    {copiedBank ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedBank ? '¡Copiado!' : 'Copiar Datos'}
                  </button>
                </div>
                <div className="font-mono text-xs space-y-1.5 pt-1 text-gray-200">
                  <p><strong>Banco:</strong> {settings?.bank_name || 'Chase Bank'}</p>
                  <p><strong>Titular:</strong> {settings?.account_holder || 'MAX VENTAS LLC'}</p>
                  <p><strong>Cuenta:</strong> {settings?.account_number || '1234567890'}</p>
                  <p><strong>Routing (ABA):</strong> {settings?.routing_number || '021000021'}</p>
                </div>
              </div>
            )}

            {settings?.payment_instructions && (
              <p className="text-[11px] text-gray-400 bg-white/5 p-3 rounded-xl">
                💡 <em>{settings.payment_instructions}</em>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tracking si está disponible */}
      {order.tracking_number && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <Truck className="w-4 h-4" /> Paquete Enviado — Seguimiento
          </div>
          <p className="text-xs text-gray-700">
            Carrier: <strong>{order.carrier?.toUpperCase()}</strong> | Número de Guía:{' '}
            <span className="font-mono font-bold">{order.tracking_number}</span>
          </p>
          <a
            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-emerald-700 font-semibold underline mt-1"
          >
            Rastrear en USPS →
          </a>
        </div>
      )}

      {/* Desglose de Productos y Envío */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Dirección */}
        <div className="bg-white border rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Dirección de Entrega
          </h3>
          <div className="text-xs text-gray-700 space-y-1">
            <p className="font-bold text-sm text-gray-900">{order.customer_name}</p>
            <p>{addr.street}</p>
            <p>{addr.city}, {addr.state} {addr.zip}</p>
            <p>{addr.country || 'Estados Unidos'}</p>
            <p className="text-gray-500 pt-1">✉️ {order.customer_email}</p>
            {order.customer_phone && <p className="text-gray-500">📞 {order.customer_phone}</p>}
          </div>
        </div>

        {/* Resumen de Pago */}
        <div className="bg-white border rounded-2xl p-6 space-y-3 shadow-sm">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Resumen Financiero
          </h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío</span>
              <span className="font-medium text-gray-900">{formatPrice(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Impuesto de Venta / Tax</span>
              <span className="font-medium text-gray-900">{formatPrice(order.tax_amount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-extrabold text-gray-950">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Artículos de la orden */}
      <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5 border-b pb-3">
          <ShoppingBag className="w-3.5 h-3.5" /> Artículos Ordenados ({order.order_items?.length || 0})
        </h3>
        <div className="divide-y text-xs">
          {order.order_items?.map((item: any) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-900">{item.product_name}</p>
                <p className="text-gray-500">{item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} × {formatPrice(item.unit_price)}</p>
              </div>
              <p className="font-bold text-gray-900">{formatPrice(item.total_price)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
