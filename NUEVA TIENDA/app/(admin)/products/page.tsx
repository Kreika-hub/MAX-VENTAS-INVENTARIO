'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Plus, Trash2, Edit, Save, X, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';

interface ProductForm {
  id?: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  stock: string;
  weight: string;
  category: string;
  images: string[];
  slug: string;
  is_active: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  function slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function startEdit(product: any) {
    setEditing({
      id: product.id,
      name: product.name || product.title || '',
      description: product.description || '',
      price: String(product.price ?? 0),
      cost: String(product.cost ?? 0),
      stock: String(product.stock ?? 0),
      weight: String(product.weight ?? 1),
      category: product.category || '',
      images: Array.isArray(product.images) ? product.images : [],
      slug: product.slug || slugify(product.name || product.title || 'producto'),
      is_active: product.is_active ?? true,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing({
      name: '',
      description: '',
      price: '0.00',
      cost: '0.00',
      stock: '0',
      weight: '1',
      category: '',
      images: [],
      slug: '',
      is_active: true,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.name.trim()) {
      alert('Por favor ingresa un nombre para el producto');
      return;
    }

    const price = parseFloat(editing.price) || 0;
    const cost = parseFloat(editing.cost) || 0;
    const stock = parseInt(editing.stock, 10) || 0;
    const weight = parseFloat(editing.weight) || 1;
    const slug = editing.slug.trim() || slugify(editing.name);

    const payload = {
      name: editing.name.trim(),
      title: editing.name.trim(), // para compatibilidad con inventario previo
      description: editing.description.trim(),
      price,
      cost,
      stock,
      weight,
      category: editing.category.trim() || null,
      images: editing.images,
      slug,
      is_active: editing.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editing.id) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) alert('Error actualizando producto: ' + error.message);
    } else {
      const { error } = await supabase.from('products').insert([payload]);
      if (error) alert('Error creando producto: ' + error.message);
    }

    setShowForm(false);
    setEditing(null);
    fetchProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchProducts();
  }

  async function toggleActive(product: any) {
    const nextActive = !product.is_active;
    await supabase.from('products').update({ is_active: nextActive }).eq('id', product.id);
    fetchProducts();
  }

  function addImage() {
    if (!imageUrlInput.trim() || !editing) return;
    setEditing({
      ...editing,
      images: [...editing.images, imageUrlInput.trim()],
    });
    setImageUrlInput('');
  }

  function removeImage(index: number) {
    if (!editing) return;
    setEditing({
      ...editing,
      images: editing.images.filter((_, i) => i !== index),
    });
  }

  const filteredProducts = products.filter((p) => {
    const name = (p.name || p.title || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const matchesCat = !filterCategory || p.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📦 Productos & Inventario</h1>
          <p className="text-sm text-gray-500">
            Gestiona los productos visibles en la tienda online y su stock.
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm w-64"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition"
        >
          Recargar
        </button>
      </div>

      {/* Formulario Modal / Drawer */}
      {showForm && editing && (
        <div className="bg-white border rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-bold">
              {editing.id ? 'Editar Producto' : 'Crear Producto'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                placeholder="ej: Vestido Floral Max"
                value={editing.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditing({
                    ...editing,
                    name: val,
                    slug: editing.id ? editing.slug : slugify(val),
                  });
                }}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Slug (URL amigable)
              </label>
              <input
                type="text"
                placeholder="ej: vestido-floral-max"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                placeholder="Detalles del producto, composición, medidas..."
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Precio de Venta ($ USD) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Costo ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={editing.cost}
                onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Stock Total Disponible
              </label>
              <input
                type="number"
                placeholder="0"
                value={editing.stock}
                onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Peso (libras / lbs para cálculo de envío)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="1.0"
                value={editing.weight}
                onChange={(e) => setEditing({ ...editing, weight: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Categoría
              </label>
              <input
                type="text"
                placeholder="ej: Vestidos, Blusas, Accesorios"
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* Imágenes */}
            <div className="md:col-span-2 space-y-3">
              <label className="block text-xs font-semibold text-gray-600">
                Imágenes (URLs directas o de Supabase Storage)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Agregar URL
                </button>
              </div>

              {editing.images.length > 0 && (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mt-2">
                  {editing.images.map((img, i) => (
                    <div key={i} className="relative aspect-square border rounded-lg overflow-hidden group">
                      <Image src={img} alt={`img-${i}`} fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-black focus:ring-black"
              />
              <span className="text-sm font-medium">Publicado y visible en la tienda</span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
              >
                <Save className="w-4 h-4" /> Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando productos...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-500">
          <p className="mb-2">No se encontraron productos.</p>
          <button
            onClick={startNew}
            className="text-black underline text-sm hover:font-medium"
          >
            Crear el primer producto
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Categoría</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map((p) => {
                const name = p.name || p.title || 'Sin nombre';
                const firstImage = Array.isArray(p.images) && p.images[0] ? p.images[0] : null;
                const isActive = p.is_active ?? true;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0 flex items-center justify-center text-gray-400">
                          {firstImage ? (
                            <Image src={firstImage} alt={name} fill className="object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            slug: {p.slug || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.category ? (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                          {p.category}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {formatPrice(p.price || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          (p.stock || 0) > 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {p.stock ?? 0} un.
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          isActive
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Visible
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Oculto
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
