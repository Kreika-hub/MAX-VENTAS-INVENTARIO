'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

type Mode = 'global' | 'multiple';

interface Variant {
  id?: string;
  talla: string;
  color: string;
  material: string;
  sku: string;
  stock: number;
  precio: number;
}

interface Product {
  id: string;
  title: string;
  cost: number;
  talla_mode: Mode; talla_global: string; talla_values: string[];
  color_mode: Mode; color_global: string; color_values: string[];
  material_mode: Mode; material_global: string; material_values: string[];
  images: string[];
  variants: Variant[];
}

const PIN = process.env.NEXT_PUBLIC_ACCESS_PIN || '';

function slugify(s: string) {
  return (s || 'producto').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'producto';
}

function emptyOptions() {
  return {
    talla_mode: 'global' as Mode, talla_global: '', talla_values: [] as string[],
    color_mode: 'global' as Mode, color_global: '', color_values: [] as string[],
    material_mode: 'global' as Mode, material_global: '', material_values: [] as string[],
  };
}

function combineVariants(p: {
  talla_mode: Mode; talla_global: string; talla_values: string[];
  color_mode: Mode; color_global: string; color_values: string[];
  material_mode: Mode; material_global: string; material_values: string[];
}, existing: Variant[]): Variant[] {
  const tallas = p.talla_mode === 'multiple' ? (p.talla_values.length ? p.talla_values : ['']) : [p.talla_global || ''];
  const colores = p.color_mode === 'multiple' ? (p.color_values.length ? p.color_values : ['']) : [p.color_global || ''];
  const materiales = p.material_mode === 'multiple' ? (p.material_values.length ? p.material_values : ['']) : [p.material_global || ''];

  const combos: Variant[] = [];
  for (const t of tallas) for (const c of colores) for (const m of materiales) {
    const prev = existing.find(v => v.talla === t && v.color === c && v.material === m);
    combos.push({
      id: prev?.id,
      talla: t, color: c, material: m,
      sku: prev?.sku || '',
      stock: prev?.stock ?? 0,
      precio: prev?.precio ?? 0,
    });
  }
  return combos;
}

function ChipInput({ values, onChange, placeholder }:{ values:string[]; onChange:(v:string[])=>void; placeholder:string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div style={{ border:'1px solid var(--line)', borderRadius:12, padding:8, background:'var(--nude-soft)' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom: values.length?8:0 }}>
        {values.map((v,i)=>(
          <span key={i} style={{ background:'var(--gold)', color:'#fff', borderRadius:20, padding:'5px 11px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
            {v}
            <span style={{cursor:'pointer'}} onClick={()=>onChange(values.filter((_,idx)=>idx!==i))}>✕</span>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={placeholder}
        style={{ width:'100%', border:'none', background:'transparent', fontSize:14, outline:'none' }}
      />
    </div>
  );
}

function OptionEditor({
  label, mode, globalVal, values, onModeChange, onGlobalChange, onValuesChange,
}:{
  label:string; mode:Mode; globalVal:string; values:string[];
  onModeChange:(m:Mode)=>void; onGlobalChange:(v:string)=>void; onValuesChange:(v:string[])=>void;
}) {
  return (
    <div style={{ marginTop:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:12.5, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'.04em' }}>{label}</span>
        <div style={{ display:'flex', background:'var(--nude-soft)', borderRadius:10, padding:3, gap:2 }}>
          {(['global','multiple'] as Mode[]).map(m => (
            <button key={m} onClick={()=>onModeChange(m)}
              style={{
                border:'none', borderRadius:8, padding:'6px 10px', fontSize:12.5, fontWeight:600, cursor:'pointer',
                background: mode===m ? 'var(--gold)' : 'transparent',
                color: mode===m ? '#fff' : 'var(--ink-soft)',
              }}>
              {m==='global' ? 'Único' : 'Varios'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'global' ? (
        <input value={globalVal} onChange={e=>onGlobalChange(e.target.value)}
          placeholder={`${label} para todo el producto (opcional)`}
          style={inputStyle} />
      ) : (
        <ChipInput values={values} onChange={onValuesChange} placeholder={`Escribe un valor y presiona Enter (ej. S, M, L)`} />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid var(--line)',
  background:'var(--nude-soft)', fontSize:15, color:'var(--ink)',
};
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:12.5, fontWeight:700, color:'var(--ink-soft)',
  margin:'18px 0 7px', textTransform:'uppercase', letterSpacing:'.04em',
};

export default function Home() {
  const [unlocked, setUnlocked] = useState(!PIN);
  const [pinInput, setPinInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('inv_pin_ok') === '1') setUnlocked(true);
  }, []);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data: prods, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) { showToast('Error cargando productos'); setLoading(false); return; }
    const { data: variants } = await supabase.from('product_variants').select('*');
    const merged = (prods || []).map((p: any) => ({
      ...p,
      variants: (variants || []).filter((v: any) => v.product_id === p.id),
    }));
    setProducts(merged);
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadProducts(); }, [unlocked, loadProducts]);

  const checkPin = () => {
    if (pinInput === PIN) {
      sessionStorage.setItem('inv_pin_ok', '1');
      setUnlocked(true);
    } else showToast('Código incorrecto');
  };

  const filtered = useMemo(
    () => products.filter(p => p.title.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );
  const totalStock = (p: Product) => p.variants.reduce((a, v) => a + (Number(v.stock) || 0), 0);

  const openNew = () => {
    setEditing({
      id: '', title: '', cost: 0, ...emptyOptions(), images: [], variants: [],
    } as Product);
    setEditorOpen(true);
  };
  const openExisting = (p: Product) => { setEditing(JSON.parse(JSON.stringify(p))); setEditorOpen(true); };
  const closeEditor = () => { setEditorOpen(false); setEditing(null); };

  const updateEditing = (patch: Partial<Product>) => {
    setEditing(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as Product;
      next.variants = combineVariants(next, prev.variants);
      return next;
    });
  };

  const compressImage = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let { width, height } = img;
        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.75);
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePhotos = async (files: FileList | null) => {
    if (!files || !editing) return;
    const slug = slugify(editing.title || 'producto');
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const path = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) { showToast('Error subiendo foto'); continue; }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } catch { showToast('Error procesando foto'); }
    }
    updateEditing({ images: [...editing.images, ...uploaded] });
  };

  const removePhoto = (i: number) => {
    if (!editing) return;
    updateEditing({ images: editing.images.filter((_, idx) => idx !== i) });
  };

  const saveProduct = async () => {
    if (!editing) return;
    if (!editing.title.trim()) { showToast('Ponle un título al producto'); return; }
    const payload = {
      title: editing.title,
      cost: editing.cost,
      talla_mode: editing.talla_mode, talla_global: editing.talla_global, talla_values: editing.talla_values,
      color_mode: editing.color_mode, color_global: editing.color_global, color_values: editing.color_values,
      material_mode: editing.material_mode, material_global: editing.material_global, material_values: editing.material_values,
      images: editing.images,
      updated_at: new Date().toISOString(),
    };
    let productId = editing.id;
    if (productId) {
      const { error } = await supabase.from('products').update(payload).eq('id', productId);
      if (error) { showToast('Error guardando producto'); return; }
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error || !data) { showToast('Error creando producto'); return; }
      productId = data.id;
    }
    const finalVariants = combineVariants(editing, editing.variants);
    await supabase.from('product_variants').delete().eq('product_id', productId);
    if (finalVariants.length) {
      await supabase.from('product_variants').insert(
        finalVariants.map(v => ({
          product_id: productId,
          talla: v.talla, color: v.color, material: v.material,
          sku: v.sku || `${slugify(editing.title)}-${v.talla}-${v.color}-${v.material}`.slice(0, 60),
          stock: v.stock, precio: v.precio,
        }))
      );
    }
    showToast('Producto guardado');
    closeEditor();
    loadProducts();
  };

  const deleteProduct = async () => {
    if (!editing?.id) return;
    if (!confirm('¿Eliminar este producto del inventario?')) return;
    await supabase.from('product_variants').delete().eq('product_id', editing.id);
    await supabase.from('products').delete().eq('id', editing.id);
    showToast('Producto eliminado');
    closeEditor();
    loadProducts();
  };

  const exportExcel = () => {
    if (!products.length) { showToast('Agrega productos primero'); return; }
    const rows: any[] = [];
    products.forEach(p => {
      const handle = slugify(p.title);
      p.variants.forEach((v, i) => {
        rows.push({
          Handle: handle,
          Title: i === 0 ? p.title : '',
          'Option1 Name': p.talla_mode === 'multiple' ? 'Talla' : '',
          'Option1 Value': p.talla_mode === 'multiple' ? v.talla : '',
          'Option2 Name': p.color_mode === 'multiple' ? 'Color' : '',
          'Option2 Value': p.color_mode === 'multiple' ? v.color : '',
          'Option3 Name': p.material_mode === 'multiple' ? 'Material' : '',
          'Option3 Value': p.material_mode === 'multiple' ? v.material : '',
          'Variant SKU': v.sku,
          'Variant Inventory Qty': v.stock,
          'Variant Price': v.precio,
          'Cost per item': p.cost,
          'Image Src': p.images[0] || '',
          Status: 'active',
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'inventario-shopify.xlsx');
  };

  const downloadAllImages = async () => {
    if (!products.length) { showToast('Agrega productos primero'); return; }
    showToast('Preparando ZIP...');
    const zip = new JSZip();
    for (const p of products) {
      const slug = slugify(p.title);
      for (let i = 0; i < p.images.length; i++) {
        try {
          const res = await fetch(p.images[i]);
          const blob = await res.blob();
          zip.file(`${slug}-${i + 1}.jpg`, blob);
        } catch { /* skip failed image */ }
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = 'imagenes-inventario.zip'; a.click();
    URL.revokeObjectURL(url);
    showToast('ZIP descargado');
  };

  if (!unlocked) {
    return (
      <div id="root-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Inventario</h1>
        <input value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPin()}
          placeholder="Código de acceso" style={{ ...inputStyle, textAlign: 'center', width: 220 }} />
        <button onClick={checkPin} style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700 }}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div id="root-shell">
      <header style={{ padding: '22px 20px 14px', position: 'sticky', top: 0, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', zIndex: 20, borderBottom: '1px solid var(--line)' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.02em' }}>Inventario</h1>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
          {loading ? 'Cargando…' : `${products.length} producto${products.length === 1 ? '' : 's'} · ${products.reduce((a, p) => a + totalStock(p), 0)} unidades`}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" style={inputStyle} />
      </header>

      <main style={{ padding: '16px 16px 110px' }}>
        <button onClick={exportExcel} style={{ width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--gold)', background: '#fff', color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 10, cursor: 'pointer' }}>
          Exportar a Excel (formato Shopify)
        </button>
        <button onClick={downloadAllImages} style={{ width: '100%', padding: 13, borderRadius: 14, border: '1px solid var(--gold)', background: '#fff', color: 'var(--gold-deep)', fontWeight: 600, marginBottom: 16, cursor: 'pointer' }}>
          Descargar todas las fotos (.zip)
        </button>

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🗂️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Aún no hay productos</div>
            <div style={{ fontSize: 13 }}>Toca el botón dorado para agregar el primero</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => openExisting(p)} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 20, overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ width: '100%', aspectRatio: '1', background: 'var(--nude-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {p.images[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Sin foto</span>}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.25 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Stock</span><b style={{ color: 'var(--gold-deep)' }}>{totalStock(p)}</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button onClick={openNew} style={{
        position: 'fixed', bottom: 26, right: 'calc(50% - 230px + 20px)', width: 58, height: 58, borderRadius: '50%',
        background: 'linear-gradient(160deg, var(--gold), var(--gold-deep))', color: '#fff', fontSize: 28, border: 'none',
        boxShadow: '0 10px 24px rgba(184,147,90,.45)', cursor: 'pointer', zIndex: 30,
      }}>+</button>

      {editorOpen && editing && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: '1px solid var(--line)' }}>
            <button onClick={closeEditor} style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 600 }}>Cancelar</button>
            <h2 style={{ fontSize: 18, margin: 0 }}>{editing.id ? 'Editar producto' : 'Nuevo producto'}</h2>
            <button onClick={saveProduct} style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 600 }}>Guardar</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            <label style={labelStyle}>Fotos del producto</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {editing.images.map((src, i) => (
                <div key={i} style={{ width: 76, height: 76, borderRadius: 14, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)' }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(43,36,28,.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}>✕</div>
                </div>
              ))}
              <label style={{ width: 76, height: 76, borderRadius: 14, border: '1.5px dashed var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-deep)', fontSize: 26, cursor: 'pointer', background: 'var(--nude-soft)' }}>
                +
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handlePhotos(e.target.files)} />
              </label>
            </div>

            <label style={labelStyle}>Título del producto</label>
            <input value={editing.title} onChange={e => updateEditing({ title: e.target.value })} placeholder="Ej. Vestido Camila lino" style={inputStyle} />

            <label style={labelStyle}>Costo de compra (por unidad)</label>
            <input type="number" value={editing.cost} onChange={e => updateEditing({ cost: Number(e.target.value) })} style={inputStyle} />

            <OptionEditor label="Talla" mode={editing.talla_mode} globalVal={editing.talla_global} values={editing.talla_values}
              onModeChange={m => updateEditing({ talla_mode: m })}
              onGlobalChange={v => updateEditing({ talla_global: v })}
              onValuesChange={v => updateEditing({ talla_values: v })} />
            <OptionEditor label="Color" mode={editing.color_mode} globalVal={editing.color_global} values={editing.color_values}
              onModeChange={m => updateEditing({ color_mode: m })}
              onGlobalChange={v => updateEditing({ color_global: v })}
              onValuesChange={v => updateEditing({ color_values: v })} />
            <OptionEditor label="Material" mode={editing.material_mode} globalVal={editing.material_global} values={editing.material_values}
              onModeChange={m => updateEditing({ material_mode: m })}
              onGlobalChange={v => updateEditing({ material_global: v })}
              onValuesChange={v => updateEditing({ material_values: v })} />

            <label style={labelStyle}>Variantes generadas ({editing.variants.length})</label>
            {editing.variants.map((v, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--ink-soft)' }}>
                  {[v.talla, v.color, v.material].filter(Boolean).join(' / ') || 'Único'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Stock</span>
                    <input type="number" value={v.stock} onChange={e => {
                      const vs = [...editing.variants]; vs[i] = { ...vs[i], stock: Number(e.target.value) };
                      setEditing({ ...editing, variants: vs });
                    }} style={inputStyle} />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Precio</span>
                    <input type="number" value={v.precio} onChange={e => {
                      const vs = [...editing.variants]; vs[i] = { ...vs[i], precio: Number(e.target.value) };
                      setEditing({ ...editing, variants: vs });
                    }} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
            {editing.id && (
              <button onClick={deleteProduct} style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid var(--danger)', background: '#fff', color: 'var(--danger)', fontWeight: 700 }}>Eliminar</button>
            )}
            <button onClick={saveProduct} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(160deg, var(--gold), var(--gold-deep))', color: '#fff', fontWeight: 700 }}>Guardar producto</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '11px 20px', borderRadius: 30, fontSize: 13.5, zIndex: 200 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
