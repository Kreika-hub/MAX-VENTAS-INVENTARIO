'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Save, Copy, Check, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase.from('store_settings').select('*').single();
    setSettings(
      data || {
        store_name: 'MAX VENTAS',
        bank_name: '',
        account_number: '',
        routing_number: '',
        account_holder: '',
        zelle_email: '',
        zelle_phone: '',
        payment_instructions: '',
        logo_url: '',
        primary_color: '#000000',
        banner_pc_url: '',
        banner_mobile_url: '',
        banner_title: 'MAX VENTAS',
        banner_subtitle: 'Descubre nuestra selección de productos de calidad. Envíos a todo Estados Unidos.',
        banner_button_text: 'Ver Catálogo →',
        banner_button_link: '/shop',
      }
    );
    setLoading(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    const { id, created_at, ...payload } = settings;
    if (id) {
      await supabase.from('store_settings').update(payload).eq('id', id);
    } else {
      await supabase.from('store_settings').insert(payload);
    }
    setSaving(false);
    alert('Configuración guardada exitosamente ✅');
  }

  function copyBankDetails() {
    if (!settings) return;
    const text = `Banco: ${settings.bank_name || ''}
Titular: ${settings.account_holder || ''}
Cuenta: ${settings.account_number || ''}
Routing: ${settings.routing_number || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="p-8 text-gray-500">Cargando configuración...</div>;

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Configuración de la Tienda</h1>
          <p className="text-sm text-gray-500">
            Personaliza banners, datos de pago (Zelle, Banco) y detalles de tu tienda.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Banners */}
      <section className="bg-white border rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-700" /> 🖼️ Banners de la Portada (Hero)
          </h2>
          <p className="text-xs text-gray-500">
            Configura imágenes diferenciadas para la versión de computadora (PC) y teléfonos móviles.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Banner PC (Desktop / Computadora)
            </label>
            <input
              type="text"
              placeholder="https://... o URL de foto ancha (1920x600 px)"
              value={settings.banner_pc_url || ''}
              onChange={(e) => setSettings({ ...settings, banner_pc_url: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
            {settings.banner_pc_url && (
              <div className="relative aspect-[21/9] border rounded-lg overflow-hidden bg-gray-100 mt-2">
                <Image
                  src={settings.banner_pc_url}
                  alt="Vista previa PC"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Banner Móvil (Teléfonos Celulares)
            </label>
            <input
              type="text"
              placeholder="https://... o URL de foto vertical (800x1000 px)"
              value={settings.banner_mobile_url || ''}
              onChange={(e) => setSettings({ ...settings, banner_mobile_url: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
            {settings.banner_mobile_url && (
              <div className="relative aspect-[4/3] max-w-[200px] border rounded-lg overflow-hidden bg-gray-100 mt-2">
                <Image
                  src={settings.banner_mobile_url}
                  alt="Vista previa Móvil"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Título Principal del Banner
            </label>
            <input
              value={settings.banner_title || ''}
              onChange={(e) => setSettings({ ...settings, banner_title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="MAX VENTAS"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Texto del Botón
            </label>
            <input
              value={settings.banner_button_text || ''}
              onChange={(e) => setSettings({ ...settings, banner_button_text: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="Ver Catálogo →"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Subtítulo / Mensaje Promocional
            </label>
            <input
              value={settings.banner_subtitle || ''}
              onChange={(e) => setSettings({ ...settings, banner_subtitle: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="Descubre nuestra selección de productos de calidad..."
            />
          </div>
        </div>
      </section>

      {/* General */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">🏪 Información General</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre de la tienda
            </label>
            <input
              value={settings.store_name || ''}
              onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Color principal (hex)
            </label>
            <div className="flex gap-2">
              <input
                value={settings.primary_color || '#000000'}
                onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                className="flex-1 px-4 py-2 border rounded-lg font-mono text-sm"
              />
              <div
                className="w-10 h-10 rounded-lg border flex-shrink-0"
                style={{ backgroundColor: settings.primary_color || '#000000' }}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              URL del Logo (Opcional)
            </label>
            <input
              value={settings.logo_url || ''}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      {/* Zelle */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg text-purple-700">📱 Datos de Pago por Zelle</h2>
        <p className="text-xs text-gray-500">
          Estos datos se le mostrarán al cliente en el Checkout y en el comprobante final.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Correo Electrónico de Zelle
            </label>
            <input
              type="email"
              value={settings.zelle_email || ''}
              onChange={(e) => setSettings({ ...settings, zelle_email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="pagos@maxventas.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Teléfono de Zelle
            </label>
            <input
              value={settings.zelle_phone || ''}
              onChange={(e) => setSettings({ ...settings, zelle_phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="+1 (305) 555-0199"
            />
          </div>
        </div>
      </section>

      {/* Bank Transfer */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-blue-700">🏦 Transferencia Bancaria Directa</h2>
          <button
            type="button"
            onClick={copyBankDetails}
            className="flex items-center gap-2 text-xs bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar datos'}
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre del Banco
            </label>
            <input
              value={settings.bank_name || ''}
              onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="Chase Bank / Bank of America / Wells Fargo"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Titular de la Cuenta (Nombre)
            </label>
            <input
              value={settings.account_holder || ''}
              onChange={(e) => setSettings({ ...settings, account_holder: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="MAX VENTAS LLC"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Número de Cuenta (Account Number)
            </label>
            <input
              value={settings.account_number || ''}
              onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
              placeholder="123456789012"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Routing Number (ABA)
            </label>
            <input
              value={settings.routing_number || ''}
              onChange={(e) => setSettings({ ...settings, routing_number: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
              placeholder="021000021"
            />
          </div>
        </div>
      </section>

      {/* Payment Instructions */}
      <section className="bg-white border rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">📝 Instrucciones Adicionales de Pago</h2>
        <p className="text-xs text-gray-500">
          Texto informativo para el comprador al finalizar su orden.
        </p>
        <textarea
          value={settings.payment_instructions || ''}
          onChange={(e) => setSettings({ ...settings, payment_instructions: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg text-sm"
          placeholder="Ej: Recuerda colocar tu número de orden en la nota de la transferencia para validar tu pago en menos de 1 hora."
        />
      </section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-medium hover:bg-gray-800 transition shadow-md disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
      </button>
    </div>
  );
}
