'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface ZoneForm {
  id?: string;
  name: string;
  states: string;
  zip_prefixes: string;
  base_cost: string;
  cost_per_lb: string;
  free_threshold: string;
  is_active: boolean;
}

export default function ShippingPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ZoneForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  useEffect(() => { fetchZones(); }, []);

  async function fetchZones() {
    setLoading(true);
    const { data } = await supabase.from('shipping_zones').select('*').order('created_at', { ascending: false });
    setZones(data || []);
    setLoading(false);
  }

  function startEdit(zone: any) {
    setEditing({
      id: zone.id,
      name: zone.name,
      states: (zone.states || []).join(','),
      zip_prefixes: (zone.zip_prefixes || []).join(','),
      base_cost: String(zone.base_cost || 0),
      cost_per_lb: String(zone.cost_per_lb || 0),
      free_threshold: zone.free_threshold ? String(zone.free_threshold) : '',
      is_active: zone.is_active,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing({
      name: '', states: '', zip_prefixes: '', base_cost: '0', cost_per_lb: '0', free_threshold: '', is_active: true,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing) return;
    const payload = {
      name: editing.name,
      states: editing.states.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
      zip_prefixes: editing.zip_prefixes.split(',').map((s) => s.trim()).filter(Boolean),
      base_cost: parseFloat(editing.base_cost) || 0,
      cost_per_lb: parseFloat(editing.cost_per_lb) || 0,
      free_threshold: editing.free_threshold ? parseFloat(editing.free_threshold) : null,
      is_active: editing.is_active,
    };

    if (editing.id) {
      await supabase.from('shipping_zones').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('shipping_zones').insert(payload);
    }

    setShowForm(false);
    setEditing(null);
    fetchZones();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta zona?')) return;
    await supabase.from('shipping_zones').delete().eq('id', id);
    fetchZones();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🚚 Zonas de Envío</h1>
        <button onClick={startNew} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Nueva Zona
        </button>
      </div>

      {showForm && editing && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{editing.id ? 'Editar Zona' : 'Nueva Zona'}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Nombre (ej: California Local)" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Estados (ej: CA,NV,AZ)" value={editing.states} onChange={(e) => setEditing({ ...editing, states: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Prefijos ZIP (ej: 90,91,92)" value={editing.zip_prefixes} onChange={(e) => setEditing({ ...editing, zip_prefixes: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Costo base ($)" type="number" step="0.01" value={editing.base_cost} onChange={(e) => setEditing({ ...editing, base_cost: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Costo por libra ($)" type="number" step="0.01" value={editing.cost_per_lb} onChange={(e) => setEditing({ ...editing, cost_per_lb: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            <input placeholder="Envío gratis desde ($) - opcional" type="number" step="0.01" value={editing.free_threshold} onChange={(e) => setEditing({ ...editing, free_threshold: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
            <span className="text-sm">Activa</span>
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
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estados</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Base</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Por lb</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Gratis desde</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{zone.name}</td>
                  <td className="px-4 py-3 text-xs">{(zone.states || []).join(', ')}</td>
                  <td className="px-4 py-3">${zone.base_cost}</td>
                  <td className="px-4 py-3">${zone.cost_per_lb}</td>
                  <td className="px-4 py-3">{zone.free_threshold ? `$${zone.free_threshold}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${zone.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {zone.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => startEdit(zone)} className="p-1 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(zone.id)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
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
