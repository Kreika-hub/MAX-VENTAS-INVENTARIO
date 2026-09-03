'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface TaxForm {
  id?: string;
  state_code: string;
  state_name: string;
  city: string;
  zip: string;
  rate: string;
  is_default: boolean;
}

export default function TaxesPage() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaxForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterState, setFilterState] = useState('');
  const supabase = createClient();

  useEffect(() => { fetchRates(); }, []);

  async function fetchRates() {
    setLoading(true);
    let query = supabase.from('tax_rates').select('*').order('state_code', { ascending: true });
    if (filterState) query = query.eq('state_code', filterState.toUpperCase());
    const { data } = await query;
    setRates(data || []);
    setLoading(false);
  }

  function startEdit(rate: any) {
    setEditing({
      id: rate.id,
      state_code: rate.state_code,
      state_name: rate.state_name,
      city: rate.city || '',
      zip: rate.zip || '',
      rate: String(rate.rate),
      is_default: rate.is_default,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing({ state_code: '', state_name: '', city: '', zip: '', rate: '', is_default: false });
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing) return;
    const rateVal = parseFloat(editing.rate);
    if (isNaN(rateVal) || rateVal < 0 || rateVal > 1) {
      alert('La tasa debe ser un número entre 0 y 1 (ej: 0.0725 para 7.25%)');
      return;
    }
    const payload = {
      state_code: editing.state_code.toUpperCase(),
      state_name: editing.state_name,
      city: editing.city.trim() || null,
      zip: editing.zip.trim() || null,
      rate: rateVal,
      is_default: editing.is_default,
    };
    if (editing.id) {
      await supabase.from('tax_rates').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('tax_rates').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    fetchRates();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta tasa?')) return;
    await supabase.from('tax_rates').delete().eq('id', id);
    fetchRates();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 Taxes</h1>
        <button onClick={startNew} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Nueva Tasa
        </button>
      </div>

      <div className="flex gap-2">
        <input placeholder="Filtrar por estado (ej: CA)" value={filterState} onChange={(e) => setFilterState(e.target.value)} className="px-4 py-2 border rounded-lg text-sm" />
        <button onClick={fetchRates} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Filtrar</button>
      </div>

      {showForm && editing && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{editing.id ? 'Editar Tasa' : 'Nueva Tasa'}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <input placeholder="Estado (ej: CA)" maxLength={2} value={editing.state_code} onChange={(e) => setEditing({ ...editing, state_code: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Nombre del estado" value={editing.state_name} onChange={(e) => setEditing({ ...editing, state_name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Tasa (ej: 0.0725 = 7.25%)" type="number" step="0.0001" value={editing.rate} onChange={(e) => setEditing({ ...editing, rate: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Ciudad (opcional)" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="ZIP (opcional)" value={editing.zip} onChange={(e) => setEditing({ ...editing, zip: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} />
            <span className="text-sm">Tasa default del estado (usada cuando no hay match de ciudad/ZIP)</span>
          </label>
          <button onClick={handleSave} className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ciudad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">ZIP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tasa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Default</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{rate.state_code} — {rate.state_name}</td>
                  <td className="px-4 py-3">{rate.city || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{rate.zip || '—'}</td>
                  <td className="px-4 py-3 font-medium">{(rate.rate * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3">
                    {rate.is_default && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Default</span>}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(rate)} className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(rate.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
