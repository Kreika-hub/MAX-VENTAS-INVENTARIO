'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  Truck, 
  CreditCard, 
  MapPin, 
  ShoppingBag, 
  ArrowLeft,
  Download,
  Image as ImageIcon,
  MessageCircle,
  FileText,
  Sparkles,
  Send
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderNumber = (params?.id as string) || 'MAX-000000';

  const receiptRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [copiedZelle, setCopiedZelle] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    const supabase = createClient();

    Promise.all([
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .maybeSingle(),
      supabase
        .from('store_settings')
        .select('*')
        .maybeSingle(),
    ]).then(([orderRes, settingsRes]) => {
      if (orderRes?.data) {
        setOrder(orderRes.data);
      } else {
        // Fallback para orden confirmada o de prueba
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
            { id: '1', product_name: 'Franela Venezuela Raíces Floral', quantity: 1, unit_price: 35.00, total_price: 35.00 },
            { id: '2', product_name: 'Crop Top Venezuela Vintage 1980', quantity: 1, unit_price: 28.00, total_price: 28.00 }
          ]
        });
      }
      if (settingsRes?.data) {
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

  const addr = order?.shipping_address || {};
  const isZelle = order?.payment_method === 'zelle';
  const waPhone = (settings?.whatsapp_number || settings?.zelle_phone || '13055550199').replace(/\D/g, '');

  const copyZelle = () => {
    const text = `Zelle: ${settings?.zelle_email || 'pagos@maxventas.com'} / Tel: ${settings?.zelle_phone || '+1 (305) 555-0199'}\nOrden: ${order.order_number}\nMonto: $${order.total}`;
    navigator.clipboard.writeText(text);
    setCopiedZelle(true);
    setTimeout(() => setCopiedZelle(false), 2000);
  };

  const copyBank = () => {
    const text = `Banco: ${settings?.bank_name || 'Chase Bank'}\nTitular: ${settings?.account_holder || 'MAX VENTAS LLC'}\nCuenta: ${settings?.account_number || '•••• 5678'}\nRouting: ${settings?.routing_number || '•••• 1234'}\nOrden: ${order.order_number}\nMonto: $${order.total}`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  // Descargar Resumen como Imagen PNG
  const downloadAsImage = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Orden_${order.order_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('Error descargando imagen.');
    } finally {
      setIsExporting(false);
    }
  };

  // Descargar Factura en PDF (Exactamente 1 Sola Página)
  const downloadAsPDF = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Ajustar si sobrepasa para que SIEMPRE sea 1 sola página
      const finalHeight = Math.min(imgHeight, pdfHeight - 20);

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, finalHeight);
      pdf.save(`Factura_${order.order_number}.pdf`);
    } catch (err) {
      alert('Error generando PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Enviar a WhatsApp con todos los datos y referencia de pago
  const sendToWhatsApp = () => {
    const itemsList = order.order_items?.map((it: any) => `• ${it.quantity}x ${it.product_name} ($${it.unit_price})`).join('\n') || 'Prendas seleccionadas';
    const addressStr = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`;

    const message = 
`🛍️ *COMPROBANTE DE PAGO - MAX VENTAS*
─────────────────────
📋 *Orden:* #${order.order_number}
👤 *Cliente:* ${order.customer_name}
📞 *Teléfono:* ${order.customer_phone}
📍 *Envío a:* ${addressStr}

📦 *Detalle del Pedido:*
${itemsList}

💰 *Monto Total:* $${Number(order.total).toFixed(2)} USD
💳 *Método:* ${isZelle ? 'Zelle' : 'Transferencia Bancaria'}
🔢 *N° de Referencia:* ${paymentReference.trim() || 'Comprobante adjunto'}
─────────────────────
Hola! Ya realicé mi pago. Adjunto la captura del comprobante en este chat para procesar mi envío. ¡Muchas gracias!`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${waPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f7f1e8]/30 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Barra superior de navegación y descargas */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8a7d6c] hover:text-[#2b241c] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
          </Link>

          <div className="flex items-center gap-2">
            {/* Botón Descargar Imagen */}
            <button
              onClick={downloadAsImage}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 text-xs bg-white border border-[#e7ddcd] hover:bg-[#f7f1e8] text-[#2b241c] px-3.5 py-2 rounded-xl font-bold transition shadow-sm"
              title="Descargar imagen del resumen"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#b8935a]" /> 
              {isExporting ? 'Generando...' : 'Descargar Imagen'}
            </button>

            {/* Botón Descargar PDF 1 Página */}
            <button
              onClick={downloadAsPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 text-xs bg-[#b8935a] hover:bg-[#9c7a45] text-white px-3.5 py-2 rounded-xl font-bold transition shadow-sm"
              title="Descargar factura en PDF de 1 sola página"
            >
              <FileText className="w-3.5 h-3.5" /> 
              Factura PDF (1 pág)
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO OFICIAL DE LA ORDEN (Capturable en Imagen y PDF)                */}
        {/* ========================================================================= */}
        <div ref={receiptRef} className="bg-white border border-[#e7ddcd] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header con Logo y Estado */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#e7ddcd]/80 pb-5 text-center sm:text-left">
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-[#e7ddcd] bg-[#2b241c] flex-shrink-0 shadow-sm">
                <Image src="/Logotipo.png" alt="MAX VENTAS" fill className="object-contain" priority />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#2b241c] tracking-tight">MAX VENTAS</h1>
                <p className="text-[11px] text-[#8a7d6c]">Factura y Comprobante Oficial de Compra</p>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <span className="inline-block bg-[#f7f1e8] border border-[#e7ddcd] text-[#b8935a] font-mono text-xs font-bold px-3.5 py-1 rounded-full">
                Orden #{order.order_number}
              </span>
              <p className="text-[10px] text-[#8a7d6c] mt-1 font-medium">
                {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Banner de Felicitaciones */}
          <div className="bg-[#f7f1e8]/60 border border-[#e7ddcd] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#2b241c]">¡Gracias por tu compra, {order.customer_name}!</h2>
              <p className="text-xs text-[#8a7d6c]">Tu pedido ha sido registrado y está listo para ser procesado.</p>
            </div>
          </div>

          {/* 1. RESUMEN DE COMPRA (ARRIBA) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#2b241c] flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#b8935a]" /> Resumen de Productos
            </h3>

            <div className="border border-[#e7ddcd] rounded-2xl overflow-hidden divide-y divide-[#e7ddcd]/60">
              {order.order_items?.map((item: any, idx: number) => (
                <div key={idx} className="p-3.5 flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#2b241c]">{item.product_name}</p>
                    <p className="text-[11px] text-[#8a7d6c]">Cantidad: {item.quantity} · Precio Unitario: {formatPrice(item.unit_price)}</p>
                  </div>
                  <span className="font-extrabold text-[#2b241c] font-mono">{formatPrice(item.total_price)}</span>
                </div>
              ))}
            </div>

            {/* Desglose de totales */}
            <div className="bg-[#f7f1e8]/40 border border-[#e7ddcd] rounded-2xl p-4 space-y-2 text-xs text-[#8a7d6c]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#2b241c]">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío ({addr.state || 'FL'})</span>
                <span className="font-semibold text-[#2b241c]">{formatPrice(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuesto / Tax ({addr.state || 'FL'} {(Number(order.tax_rate || 0.07) * 100).toFixed(2)}%)</span>
                <span className="font-semibold text-[#b8935a]">{formatPrice(order.tax_amount)}</span>
              </div>
              <div className="border-t border-[#e7ddcd] pt-2 flex justify-between items-center text-sm font-extrabold text-[#2b241c]">
                <span>Total a Pagar</span>
                <span className="text-lg text-[#b8935a]">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* 2. DATOS DE ENTREGA Y CONTACTO */}
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="border border-[#e7ddcd] rounded-2xl p-4 space-y-1.5">
              <p className="font-bold text-[#2b241c] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#b8935a]">
                <MapPin className="w-3.5 h-3.5" /> Dirección de Entrega en USA
              </p>
              <p className="font-semibold text-[#2b241c]">{addr.street || '2655 Le Jeune Rd, Suite 203'}</p>
              <p className="text-[#8a7d6c]">{addr.city || 'Coral Gables'}, {addr.state || 'FL'} {addr.zip || '33134'}</p>
              <p className="text-[#8a7d6c]">Estados Unidos 🇺🇸</p>
            </div>

            <div className="border border-[#e7ddcd] rounded-2xl p-4 space-y-1.5">
              <p className="font-bold text-[#2b241c] flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#b8935a]">
                <Truck className="w-3.5 h-3.5" /> Datos del Cliente
              </p>
              <p className="font-semibold text-[#2b241c]">{order.customer_name}</p>
              <p className="text-[#8a7d6c]">Email: {order.customer_email}</p>
              <p className="text-[#8a7d6c]">Tel / WhatsApp: {order.customer_phone}</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN DE PAGO Y ENVÍO DEL COMPROBANTE A WHATSAPP                        */}
        {/* ========================================================================= */}
        <div className="bg-[#2b241c] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold text-[#b8935a] uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Paso Final
              </span>
              <h2 className="text-lg font-bold text-white">💳 Datos para Realizar tu Pago</h2>
            </div>
            <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs px-3 py-1 rounded-full font-bold">
              Pendiente de Confirmación
            </span>
          </div>

          <p className="text-xs text-gray-300">
            Realiza la transferencia del monto total de <strong className="text-[#b8935a] text-sm">{formatPrice(order.total)}</strong> e ingresa el número de referencia para enviar tu comprobante:
          </p>

          {/* Tarjeta Zelle / Banco */}
          {isZelle ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">📱 Zelle Oficial</span>
                <button
                  onClick={copyZelle}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-[#2b241c] px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition"
                >
                  {copiedZelle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedZelle ? '¡Copiado!' : 'Copiar Datos'}
                </button>
              </div>
              <div className="font-mono text-xs space-y-1 text-gray-300">
                <p><strong>Email:</strong> {settings?.zelle_email || 'pagos@maxventas.com'}</p>
                <p><strong>Teléfono:</strong> {settings?.zelle_phone || '+1 (305) 555-0199'}</p>
                <p><strong>Titular:</strong> {settings?.account_holder || 'MAX VENTAS LLC'}</p>
                <p><strong>Nota / Concepto:</strong> #{order.order_number}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">🏦 Transferencia Bancaria Directa</span>
                <button
                  onClick={copyBank}
                  className="inline-flex items-center gap-1.5 text-xs bg-white text-[#2b241c] px-3 py-1.5 rounded-lg font-bold hover:bg-gray-100 transition"
                >
                  {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBank ? '¡Copiado!' : 'Copiar Datos'}
                </button>
              </div>
              <div className="font-mono text-xs space-y-1 text-gray-300">
                <p><strong>Banco:</strong> {settings?.bank_name || 'Chase Bank'}</p>
                <p><strong>Titular:</strong> {settings?.account_holder || 'MAX VENTAS LLC'}</p>
                <p><strong>Cuenta:</strong> {settings?.account_number || '•••• 5678'}</p>
                <p><strong>Routing:</strong> {settings?.routing_number || '•••• 1234'}</p>
                <p><strong>Nota / Referencia:</strong> #{order.order_number}</p>
              </div>
            </div>
          )}

          {/* Formulario de Referencia de Pago y Envío a WhatsApp */}
          <div className="bg-[#1f1a14] border border-[#b8935a]/40 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#b8935a] mb-1">
                🔢 Introduce el Número de Referencia de tu Pago:
              </label>
              <input
                type="text"
                placeholder="ej: Ref Zelle #98745612 / Depósito"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-xl text-white text-xs outline-none focus:border-[#b8935a] font-mono"
              />
            </div>

            <button
              onClick={sendToWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white py-4 px-6 rounded-2xl font-extrabold text-sm shadow-xl flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              Enviar Comprobante por WhatsApp con Toda la Info
            </button>

            <p className="text-[11px] text-gray-400 text-center">
              Al presionar el botón se abrirá WhatsApp con el resumen completo de tu orden y tu número de referencia para que adjuntes la captura de pago.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
