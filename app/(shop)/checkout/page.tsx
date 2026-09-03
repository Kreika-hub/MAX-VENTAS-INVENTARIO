'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/stores/cart';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import { 
  ShoppingBag, 
  MapPin, 
  User, 
  CreditCard, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import Image from 'next/image';

const US_STATES = [
  { code: 'FL', name: 'Florida' },
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'NY', name: 'New York' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const STATE_TAX_MAP: Record<string, number> = {
  FL: 0.07, CA: 0.0725, TX: 0.0625, NY: 0.08875, NJ: 0.06625, GA: 0.04,
  PA: 0.06, IL: 0.0625, OH: 0.0575, NC: 0.0475, VA: 0.053, WA: 0.065,
  MA: 0.0625, AZ: 0.056, IN: 0.07, TN: 0.07, MO: 0.04225, MD: 0.06,
  WI: 0.05, CO: 0.029, MN: 0.06875, SC: 0.06, AL: 0.04, LA: 0.0445,
  KY: 0.06, OR: 0.00, DE: 0.00, MT: 0.00, NH: 0.00, AK: 0.00
};

export default function CheckoutPage() {
  const { items, total: subtotalFn, totalWeight, clearCart, addItem, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  const [isHydrated, setIsHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  const [shipping, setShipping] = useState({ cost: 5.0, name: 'Tarifa Florida / Local', free: false });
  const [tax, setTax] = useState({ rate: 0.07, amount: 0 });

  // Dirección y datos del comprador
  const [form, setForm] = useState({
    name: 'Cliente Demo',
    email: 'cliente@ejemplo.com',
    phone: '(305) 555-0199',
    street: '2655 Le Jeune Rd',
    apartment: 'Suite 203',
    city: 'Coral Gables',
    state: 'FL',
    zip: '33134',
    country: 'US',
  });

  const [paymentMethod, setPaymentMethod] = useState<'zelle' | 'bank_transfer'>('zelle');
  const [addressQuickPaste, setAddressQuickPaste] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsHydrated(true);
    const supabase = createClient();
    supabase
      .from('store_settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) setSettings(data);
      });
  }, []);

  const subtotal = subtotalFn();

  // Función inteligente para parsear direcciones completas de corrido
  const parsePastedAddress = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    const zipMatch = raw.match(/\b\d{5}(-\d{4})?\b/);
    const foundZip = zipMatch ? zipMatch[0].substring(0, 5) : form.zip;

    const stateMatch = raw.match(/\b([A-Z]{2})\b/);
    let foundState = form.state;
    if (stateMatch && US_STATES.some(s => s.code === stateMatch[1])) {
      foundState = stateMatch[1];
    }

    const parts = raw.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const streetPart = parts[0];
      const aptPart = parts.length >= 4 ? parts[1] : '';
      const cityPart = parts.length >= 4 ? parts[2] : parts[1];

      setForm(prev => ({
        ...prev,
        street: streetPart || prev.street,
        apartment: aptPart || prev.apartment,
        city: cityPart.replace(/\b[A-Z]{2}\b/g, '').replace(/\b\d{5}\b/g, '').trim() || prev.city,
        state: foundState,
        zip: foundZip,
      }));
    } else {
      setForm(prev => ({ ...prev, street: raw, state: foundState, zip: foundZip }));
    }
  };

  const handleZipChange = (zipVal: string) => {
    const cleanZip = zipVal.replace(/\D/g, '').slice(0, 5);
    let autoState = form.state;
    let autoCity = form.city;

    if (cleanZip.startsWith('33') || cleanZip.startsWith('32') || cleanZip.startsWith('34')) {
      autoState = 'FL';
      if (cleanZip === '33134') autoCity = 'Coral Gables';
      else if (cleanZip.startsWith('331')) autoCity = 'Miami';
    } else if (cleanZip.startsWith('90') || cleanZip.startsWith('91') || cleanZip.startsWith('92')) {
      autoState = 'CA';
      if (cleanZip.startsWith('900') || cleanZip.startsWith('902')) autoCity = 'Los Angeles';
    } else if (cleanZip.startsWith('75') || cleanZip.startsWith('77') || cleanZip.startsWith('78')) {
      autoState = 'TX';
      if (cleanZip.startsWith('750') || cleanZip.startsWith('752')) autoCity = 'Dallas';
      else if (cleanZip.startsWith('770')) autoCity = 'Houston';
    } else if (cleanZip.startsWith('10') || cleanZip.startsWith('11')) {
      autoState = 'NY';
      autoCity = 'New York';
    }

    setForm(prev => ({
      ...prev,
      zip: cleanZip,
      state: autoState,
      city: autoCity || prev.city
    }));
  };

  // Recalcular Tax y Envío inmediatamente
  useEffect(() => {
    if (!isHydrated) return;

    const currentSubtotal = subtotalFn();
    const currentState = (form.state || 'FL').toUpperCase();
    const rate = STATE_TAX_MAP[currentState] ?? 0.07;
    const computedTax = Math.round(currentSubtotal * rate * 100) / 100;

    // Actualización inmediata síncrona
    setTax({ rate, amount: computedTax });

    if (currentSubtotal > 0) {
      // Envío
      fetch('/api/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip: form.zip || '33134',
          state: currentState,
          weight: totalWeight() || 1,
          total: currentSubtotal,
        }),
      })
        .then(r => r.json())
        .then(res => {
          if (res && typeof res.cost === 'number') {
            setShipping(res);
          }
        })
        .catch(() => {
          setShipping({ cost: 5.0, name: 'Tarifa Estándar', free: false });
        });

      // Tax vía API
      fetch('/api/calculate-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip: form.zip || '33134',
          city: form.city || 'Coral Gables',
          state: currentState,
          amount: currentSubtotal,
        }),
      })
        .then(r => r.json())
        .then(res => {
          if (res && typeof res.amount === 'number') {
            setTax({ rate: res.rate || rate, amount: res.amount });
          }
        })
        .catch(() => {});
    }
  }, [form.zip, form.state, form.city, subtotal, isHydrated]);

  // Validaciones
  const errors = useMemo(() => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'Ingresa tu nombre completo';
    if (!form.email.includes('@')) err.email = 'Ingresa un correo electrónico válido';
    if (form.phone.replace(/\D/g, '').length < 7) err.phone = 'Ingresa un teléfono válido';
    if (!form.street.trim()) err.street = 'Ingresa la calle y número (ej: 2655 Le Jeune Rd)';
    if (!form.city.trim()) err.city = 'Ingresa la ciudad (ej: Coral Gables)';
    if (!form.state) err.state = 'Selecciona un estado';
    if (form.zip.length !== 5) err.zip = 'El código ZIP debe tener 5 dígitos';
    return err;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  // Cargar productos de prueba para mockup
  const loadMockProducts = () => {
    clearCart();
    addItem({
      productId: 'demo-1',
      name: 'Franela Venezuela Raíces Floral',
      price: 35.00,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&q=80',
      weight: 0.8,
    });
    addItem({
      productId: 'demo-2',
      name: 'Crop Top Venezuela Vintage 1980',
      price: 28.00,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&q=80',
      weight: 0.6,
    });
  };

  const grandTotal = Math.round((subtotal + tax.amount + (shipping.free ? 0 : shipping.cost)) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTouched({
        name: true,
        email: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        zip: true,
      });
      alert('Por favor revisa los campos en rojo antes de continuar.');
      return;
    }

    if (items.length === 0) {
      alert('Tu carrito está vacío. Agrega productos.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const orderNumber = `MAX-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const fullStreet = form.apartment ? `${form.street}, ${form.apartment}` : form.street;

    try {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_email: form.email,
          customer_name: form.name,
          customer_phone: form.phone,
          shipping_address: {
            street: fullStreet,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: 'US',
          },
          subtotal,
          tax_amount: tax.amount,
          tax_rate: tax.rate,
          shipping_cost: shipping.free ? 0 : shipping.cost,
          total: grandTotal,
          payment_method: paymentMethod,
          payment_status: 'pending',
          status: 'pending',
          notes: `Pago: ${paymentMethod === 'zelle' ? 'Zelle' : 'Transferencia Bancaria'}`,
        })
        .select()
        .single();

      if (error) {
        console.warn('Error guardando en Supabase, procediendo con orden local demo:', error);
      } else if (order?.id && items.length > 0) {
        // Insertar items
        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));
        await supabase.from('order_items').insert(orderItems);
      }
    } catch (err) {
      console.warn('Procediendo con orden demo:', err);
    }

    clearCart();
    router.push(`/order/${orderNumber}`);
  };

  if (!isHydrated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto"></div>
          <div className="h-64 bg-gray-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e8]/30 pb-24">
      {/* Header del Checkout */}
      <div className="bg-white border-b border-[#e7ddcd] sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold tracking-tight text-[#2b241c]">MAX VENTAS</span>
            <span className="text-xs bg-[#f7f1e8] text-[#b8935a] border border-[#e7ddcd] px-2.5 py-0.5 rounded-full font-bold">
              Checkout Seguro 🔒
            </span>
          </div>
          <button
            onClick={() => router.push('/shop')}
            className="text-xs font-semibold text-[#8a7d6c] hover:text-[#2b241c] hover:underline"
          >
            ← Volver a la Tienda
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {items.length === 0 ? (
          <div className="max-w-xl mx-auto bg-white border border-[#e7ddcd] rounded-3xl p-8 text-center space-y-5 shadow-sm my-10">
            <div className="w-16 h-16 bg-[#f7f1e8] text-[#b8935a] rounded-full flex items-center justify-center mx-auto text-2xl">
              🛒
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#2b241c] mb-1.5">Tu carrito está vacío</h2>
              <p className="text-xs text-[#8a7d6c] max-w-sm mx-auto">
                Puedes cargar productos de prueba para experimentar la compra, el desglose de impuestos y el recibo oficial.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={loadMockProducts}
                className="inline-flex items-center justify-center gap-2 bg-[#b8935a] text-white px-6 py-3.5 rounded-xl font-bold text-xs hover:bg-[#9c7a45] transition shadow-md"
              >
                <Sparkles className="w-4 h-4 text-yellow-200" />
                Cargar Productos de Prueba (Demo)
              </button>
              <button
                onClick={() => router.push('/shop')}
                className="px-6 py-3.5 border border-[#e7ddcd] rounded-xl font-bold text-xs hover:bg-[#f7f1e8] text-[#2b241c] transition"
              >
                Ir al Catálogo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Columna Izquierda: Formulario (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Contacto */}
                <div className="bg-white p-6 rounded-2xl border border-[#e7ddcd] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e7ddcd]/70 pb-3">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-[#2b241c]">
                      <User className="w-4 h-4 text-[#b8935a]" /> 1. Información de Contacto
                    </h2>
                    <span className="text-[11px] text-[#8a7d6c]">Paso 1 de 3</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        placeholder="ej: María Pérez"
                        value={form.name}
                        onBlur={() => setTouched(t => ({ ...t, name: true }))}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition outline-none ${
                          touched.name && errors.name ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={form.email}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition outline-none ${
                          touched.email && errors.email ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                        Teléfono Móvil (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        placeholder="(305) 555-0199"
                        value={form.phone}
                        onBlur={() => setTouched(t => ({ ...t, phone: true }))}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition outline-none ${
                          touched.phone && errors.phone ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Dirección */}
                <div className="bg-white p-6 rounded-2xl border border-[#e7ddcd] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e7ddcd]/70 pb-3">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-[#2b241c]">
                      <MapPin className="w-4 h-4 text-[#b8935a]" /> 2. Dirección de Envío en EE. UU.
                    </h2>
                    <span className="text-[11px] text-[#8a7d6c]">Paso 2 de 3</span>
                  </div>

                  {/* Autocompletar rápido */}
                  <div className="bg-[#f7f1e8] p-3 rounded-xl border border-[#e7ddcd] space-y-1">
                    <label className="block text-[11px] font-bold text-[#b8935a]">
                      ⚡ Autocompletar: Pega tu dirección completa aquí
                    </label>
                    <input
                      type="text"
                      placeholder="ej: 2655 Le Jeune Rd, Suite 203, Coral Gables, FL 33134"
                      value={addressQuickPaste}
                      onChange={(e) => {
                        setAddressQuickPaste(e.target.value);
                        parsePastedAddress(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#e7ddcd] rounded-lg text-xs outline-none focus:border-[#b8935a] font-mono"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                        Calle y Número *
                      </label>
                      <input
                        type="text"
                        placeholder="2655 Le Jeune Rd"
                        value={form.street}
                        onBlur={() => setTouched(t => ({ ...t, street: true }))}
                        onChange={(e) => setForm({ ...form, street: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition outline-none ${
                          touched.street && errors.street ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                        Apartamento / Suite (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Suite 203 / Apto 4B"
                        value={form.apartment}
                        onChange={(e) => setForm({ ...form, apartment: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-[#e7ddcd] rounded-xl text-xs focus:border-[#b8935a] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                          Ciudad *
                        </label>
                        <input
                          type="text"
                          placeholder="Coral Gables"
                          value={form.city}
                          onBlur={() => setTouched(t => ({ ...t, city: true }))}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition outline-none ${
                            touched.city && errors.city ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                          Estado *
                        </label>
                        <select
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-[#e7ddcd] rounded-xl text-xs bg-white focus:border-[#b8935a] outline-none font-medium text-[#2b241c]"
                        >
                          {US_STATES.map((st) => (
                            <option key={st.code} value={st.code}>
                              {st.code} - {st.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#2b241c] mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          placeholder="33134"
                          maxLength={5}
                          value={form.zip}
                          onBlur={() => setTouched(t => ({ ...t, zip: true }))}
                          onChange={(e) => handleZipChange(e.target.value)}
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono transition outline-none ${
                            touched.zip && errors.zip ? 'border-red-500 bg-red-50/30' : 'border-[#e7ddcd] focus:border-[#b8935a]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Método de Pago */}
                <div className="bg-white p-6 rounded-2xl border border-[#e7ddcd] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e7ddcd]/70 pb-3">
                    <h2 className="text-sm font-bold flex items-center gap-2 text-[#2b241c]">
                      <CreditCard className="w-4 h-4 text-[#b8935a]" /> 3. Método de Pago
                    </h2>
                    <span className="text-[11px] text-[#8a7d6c]">Paso 3 de 3</span>
                  </div>

                  <div className="space-y-3">
                    <label
                      onClick={() => setPaymentMethod('zelle')}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                        paymentMethod === 'zelle'
                          ? 'border-[#b8935a] bg-[#f7f1e8]/60 ring-2 ring-[#b8935a]/30'
                          : 'border-[#e7ddcd] hover:bg-[#f7f1e8]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'zelle'}
                        onChange={() => setPaymentMethod('zelle')}
                        className="mt-1 text-[#b8935a] focus:ring-[#b8935a]"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#2b241c]">Zelle Oficial</p>
                          <span className="font-bold text-[#b8935a] bg-white border border-[#e7ddcd] px-2 py-0.5 rounded text-[10px]">
                            Recomendado
                          </span>
                        </div>
                        <p className="text-[#8a7d6c] mt-0.5">
                          Envío directo a {settings?.zelle_email || 'pagos@maxventas.com'}
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                        paymentMethod === 'bank_transfer'
                          ? 'border-[#b8935a] bg-[#f7f1e8]/60 ring-2 ring-[#b8935a]/30'
                          : 'border-[#e7ddcd] hover:bg-[#f7f1e8]/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={() => setPaymentMethod('bank_transfer')}
                        className="mt-1 text-[#b8935a] focus:ring-[#b8935a]"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-[#2b241c]">Transferencia Bancaria Directa</p>
                          <span className="font-bold text-[#8a7d6c] bg-white border border-[#e7ddcd] px-2 py-0.5 rounded text-[10px]">
                            ACH / Wire
                          </span>
                        </div>
                        <p className="text-[#8a7d6c] mt-0.5">
                          Depósito en cuenta bancaria en USA
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="w-full bg-[#b8935a] hover:bg-[#9c7a45] text-white py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Generando tu Orden...' : `Confirmar Orden por ${formatPrice(grandTotal)}`} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Columna Derecha: Resumen (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-[#e7ddcd] shadow-sm sticky top-24 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e7ddcd]/70 pb-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#2b241c] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#b8935a]" /> Resumen de Compra ({items.length})
                  </h3>
                  <button
                    onClick={loadMockProducts}
                    className="text-[11px] font-bold text-[#b8935a] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Cargar Demo
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-3 max-h-[280px] overflow-y-auto divide-y divide-[#e7ddcd]/50 pr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex gap-3 pt-3 first:pt-0 items-center">
                      <div className="w-14 h-14 bg-[#f7f1e8] rounded-xl overflow-hidden relative flex-shrink-0 border border-[#e7ddcd]">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Prenda</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-[#2b241c] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#8a7d6c] font-mono">{formatPrice(item.price)} c/u</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-5 h-5 bg-[#f7f1e8] rounded flex items-center justify-center text-xs hover:bg-[#efe4d6]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold px-1 text-[#2b241c]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-5 h-5 bg-[#f7f1e8] rounded flex items-center justify-center text-xs hover:bg-[#efe4d6]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xs text-[#b8935a]">{formatPrice(item.price * item.quantity)}</p>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-gray-400 hover:text-red-500 p-1 mt-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desglose Financiero con Taxes y Envíos */}
                <div className="border-t border-[#e7ddcd] pt-3.5 space-y-2 text-xs text-[#8a7d6c]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-[#2b241c]">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Envío ({form.state || 'FL'})</span>
                    <span className="font-bold text-[#2b241c]">
                      {shipping.free ? <span className="text-green-600">Gratis</span> : formatPrice(shipping.cost)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Impuesto / Sales Tax ({form.state || 'FL'} {(tax.rate * 100).toFixed(2)}%)</span>
                    <span className="font-bold text-[#b8935a]">{formatPrice(tax.amount)}</span>
                  </div>

                  <div className="border-t border-[#e7ddcd] pt-3 flex justify-between items-center text-base font-extrabold text-[#2b241c]">
                    <span>Total Final</span>
                    <span className="text-xl text-[#b8935a]">{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                <div className="bg-[#f7f1e8] rounded-xl p-3 text-[11px] text-[#8a7d6c] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Envíos con USPS Tracking a todo Estados Unidos.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
