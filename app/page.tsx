'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';

type Mode = 'global' | 'multiple';

interface Variant {
  id?: string;
  talla: string;
  color: string;
  material: string;
  sku: string;
  stock: number;
  shopify_stock: number;
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
  created_at?: string;
}

interface Client {
  id: string;
  alias: string;
  phone: string;
  country_code: string;
  created_at?: string;
}

interface Client {
  id: string;
  alias: string;
  phone: string;
  country_code: string;
  created_at?: string;
}

interface Sale {
  id: string;
  product_id: string;
  variant_id: string;
  channel: string;
  status: string;
  quantity: number;
  total_price: number;
  total_cost: number;
  client_info?: string;
  client_id?: string;
  created_at: string;
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
      shopify_stock: prev?.shopify_stock ?? 0,
      precio: prev?.precio ?? 0,
    });
  }
  return combos;
}

function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 8, background: 'var(--nude-soft)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: values.length ? 8 : 0 }}>
        {values.map((v, i) => (
          <span key={i} style={{ background: 'var(--gold)', color: '#fff', borderRadius: 20, padding: '5px 11px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {v}
            <span style={{ cursor: 'pointer' }} onClick={() => onChange(values.filter((_, idx) => idx !== i))}>✕</span>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, outline: 'none' }}
        />
        <button type="button" onClick={add} style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 10, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          Agregar
        </button>
      </div>
    </div>
  );
}

function OptionEditor({ label, mode, globalVal, values, onModeChange, onGlobalChange, onValuesChange }: {
  label: string; mode: Mode; globalVal: string; values: string[];
  onModeChange: (m: Mode) => void; onGlobalChange: (v: string) => void; onValuesChange: (v: string[]) => void;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        <div style={{ display: 'flex', background: 'var(--nude-soft)', borderRadius: 10, padding: 3, gap: 2 }}>
          {(['global', 'multiple'] as Mode[]).map(m => (
            <button key={m} onClick={() => onModeChange(m)}
              style={{
                border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                background: mode === m ? 'var(--gold)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--ink-soft)',
              }}>
              {m === 'global' ? 'Único' : 'Varios'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'global' ? (
        <input value={globalVal} onChange={e => onGlobalChange(e.target.value)}
          placeholder={`${label} para todo el producto (opcional)`}
          style={inputStyle} />
      ) : (
        <ChipInput values={values} onChange={onValuesChange} placeholder={`Escribe un valor y presiona Enter (ej. S, M, L)`} />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)',
  background: 'var(--nude-soft)', fontSize: 15, color: 'var(--ink)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)',
  margin: '18px 0 7px', textTransform: 'uppercase', letterSpacing: '.04em',
};

export default function Home() {
  const [unlocked, setUnlocked] = useState(!PIN);
  const [pinInput, setPinInput] = useState('');
  const [tab, setTab] = useState<'inventario' | 'vender' | 'metricas'>('inventario');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !(window as any).MSStream);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (standalone) setInstalled(true);
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    const onInstalled = () => setInstalled(true);
    window.addEventListener('appinstalled', onInstalled);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('Para instalar en iPhone: toca el ícono de Compartir (□↑) en la barra de Safari y selecciona "Agregar a pantalla de inicio".');
      return;
    }
    if (!deferredPrompt) { alert('Ya está instalada o tu navegador no lo permite en este momento.'); return; }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cardCompact, setCardCompact] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toast, setToast] = useState('');

  // POS state
  const [posProduct, setPosProduct] = useState('');
  const [posVariant, setPosVariant] = useState('');
  const [posQty, setPosQty] = useState(1);
  const [posChannel, setPosChannel] = useState('Shopify');
  const [posAction, setPosAction] = useState('Vendido');
  const [posClient, setPosClient] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [posClientId, setPosClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCountry, setNewCountry] = useState('+58');
  const [newCountryCustom, setNewCountryCustom] = useState('');
  const [reportRange, setReportRange] = useState<'week' | 'month' | '3months' | 'all'>('month');
  const [reportChannel, setReportChannel] = useState('all');
  const [reportShowMargin, setReportShowMargin] = useState(true);
  const [reportShowChart, setReportShowChart] = useState(true);
  const [reportShowTopBottom, setReportShowTopBottom] = useState(true);
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('inv_pin_ok') === '1') setUnlocked(true);
  }, []);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    const { data: variants } = await supabase.from('product_variants').select('*');
    const { data: sls } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    const { data: cls } = await supabase.from('clients').select('*').order('alias', { ascending: true });
    const merged = (prods || []).map((p: any) => ({ ...p, variants: (variants || []).filter((v: any) => v.product_id === p.id) }));
    setProducts(merged);
    setSales(sls || []);
    setClients(cls || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (unlocked) loadData(); }, [unlocked, loadData]);

  const checkPin = () => {
    if (pinInput === PIN) { sessionStorage.setItem('inv_pin_ok', '1'); setUnlocked(true); }
    else showToast('Código incorrecto');
  };

  const filtered = useMemo(() => products.filter(p => p.title.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const totalStock = (p: Product) => p.variants.reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const totalShopify = (p: Product) => p.variants.reduce((a, v) => a + (Number(v.shopify_stock) || 0), 0);

  const openNew = () => { setEditing({ id: '', title: '', cost: 0, ...emptyOptions(), images: [], variants: [] } as Product); setEditorOpen(true); };
  const openExisting = (p: Product) => { setEditing(JSON.parse(JSON.stringify(p))); setEditorOpen(true); };
  const closeEditor = () => { setEditorOpen(false); setEditing(null); };

  const updateEditing = (patch: Partial<Product>) => {
    setEditing(prev => {
      if (!prev) return prev;
      return { ...prev, ...patch } as Product;
    });
  };

  const updateOptions = (patch: Partial<Product>) => {
    setEditing(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as Product;
      next.variants = combineVariants(next, prev.variants);
      return next;
    });
  };

  const compressImage = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('El archivo no es una imagen')); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1000;
          let { width, height } = img;
          if (!width || !height) { resolve(file); return; }
          if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
          else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(b => b ? resolve(b) : resolve(file), 'image/jpeg', 0.75);
        } catch { resolve(file); }
      };
      // Si el navegador no puede decodificar la imagen (ej. formato HEIC no soportado),
      // subimos el archivo original en vez de fallar por completo.
      img.onerror = () => resolve(file);
      img.src = e.target!.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

  const [pendingFiles, setPendingFiles] = useState<{ file: File; url: string }[]>([]);
  const [pendingIndex, setPendingIndex] = useState(0);

  const startPreview = (files: FileList | null) => {
    if (!files || !editing) return;
    const remainingSlots = 4 - editing.images.length;
    if (remainingSlots <= 0) { showToast('⚠️ Máximo 4 fotos por producto'); return; }
    const arr = Array.from(files).slice(0, remainingSlots).map(f => ({ file: f, url: URL.createObjectURL(f) }));
    if (arr.length === 0) return;
    setPendingFiles(arr);
    setPendingIndex(0);
  };

  const uploadOnePhoto = async (file: File) => {
    if (!editing) return;
    const slug = slugify(editing.title || 'producto');
    try {
      const blob = await compressImage(file);
      const path = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) { showToast('Error subiendo foto: ' + error.message); return; }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      updateEditing({ images: [...editing.images, data.publicUrl] });
    } catch { showToast('Error procesando foto'); }
  };

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropImgSize, setCropImgSize] = useState({ w: 0, h: 0 });
  const dragRef = useState({ dragging: false, startX: 0, startY: 0, startPos: { x: 0, y: 0 } })[0];

  const confirmPendingPhoto = () => {
    const item = pendingFiles[pendingIndex];
    if (!item) return;
    setCropZoom(1); setCropPos({ x: 0, y: 0 });
    setCropSrc(item.url);
  };

  const finishCrop = async () => {
    const item = pendingFiles[pendingIndex];
    if (!item || !cropSrc) return;
    showToast('Subiendo foto...');
    try {
      const frame = 280;
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = cropSrc; });
      const scale = Math.max(frame / img.width, frame / img.height) * cropZoom;
      const drawW = img.width * scale, drawH = img.height * scale;
      const canvas = document.createElement('canvas');
      canvas.width = 800; canvas.height = 800;
      const ctx = canvas.getContext('2d')!;
      const outScale = 800 / frame;
      const dx = (frame - drawW) / 2 + cropPos.x;
      const dy = (frame - drawH) / 2 + cropPos.y;
      ctx.drawImage(img, dx * outScale, dy * outScale, drawW * outScale, drawH * outScale);
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b || new Blob()), 'image/jpeg', 0.8));
      const slug = slugify(editing?.title || 'producto');
      const path = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
      const { error } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) { showToast('Error subiendo foto: ' + error.message); }
      else {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        setEditing(prev => prev ? { ...prev, images: [...prev.images, data.publicUrl] } : prev);
      }
    } catch (e: any) {
      showToast('Error procesando foto' + (e?.message ? ': ' + e.message : ''));
    }
    setCropSrc(null);
    const next = pendingIndex + 1;
    if (next < pendingFiles.length) setPendingIndex(next);
    else { setPendingFiles([]); setPendingIndex(0); }
  };

  const cancelPendingPhoto = () => {
    const next = pendingIndex + 1;
    if (next < pendingFiles.length) setPendingIndex(next);
    else { setPendingFiles([]); setPendingIndex(0); }
  };

  const handlePhotos = (files: FileList | null) => startPreview(files);

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
          stock: v.stock, shopify_stock: v.shopify_stock || 0, precio: v.precio,
        }))
      );
    }
    showToast('Producto guardado ✓');
    closeEditor();
    loadData();
  };

  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const deleteProduct = async () => {
    if (!editing?.id) return;
    setConfirmModal({
      message: '¿Eliminar este producto del inventario?',
      onConfirm: () => performDeleteProduct(),
    });
  };

  const performDeleteProduct = async () => {
    setConfirmModal(null);
    if (!editing?.id) return;
    await supabase.from('product_variants').delete().eq('product_id', editing.id);
    await supabase.from('products').delete().eq('id', editing.id);
    showToast('Producto eliminado');
    closeEditor();
    loadData();
  };

  const buildExcelRows = () => {
    const rows: any[] = [];
    products.forEach(p => {
      const handle = slugify(p.title);
      p.variants.forEach((v, i) => {
        rows.push({
          Handle: handle, Title: i === 0 ? p.title : '',
          'Option1 Name': p.talla_mode === 'multiple' ? 'Talla' : '',
          'Option1 Value': p.talla_mode === 'multiple' ? v.talla : '',
          'Option2 Name': p.color_mode === 'multiple' ? 'Color' : '',
          'Option2 Value': p.color_mode === 'multiple' ? v.color : '',
          'Option3 Name': p.material_mode === 'multiple' ? 'Material' : '',
          'Option3 Value': p.material_mode === 'multiple' ? v.material : '',
          'Variant SKU': v.sku,
          'Stock General': v.stock,
          'Stock Shopify': v.shopify_stock,
          'Precio Venta': v.precio,
          'Costo': p.cost,
          'Ganancia': v.precio - p.cost,
          'Image Src': p.images[0] || '',
          Status: 'active',
        });
      });
    });
    return rows;
  };

  const exportExcel = () => {
    if (!products.length) { showToast('Agrega productos primero'); return; }
    setExcelPreviewOpen(true);
  };

  const downloadExcelFile = () => {
    const rows = buildExcelRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'inventario.xlsx');
    setExcelPreviewOpen(false);
  };

  const downloadAllImages = async () => {
    if (!products.length) { showToast('Agrega productos primero'); return; }
    showToast('Preparando ZIP...');
    const zip = new JSZip();
    for (const p of products) {
      const slug = slugify(p.title);
      const folder = zip.folder(slug)!;
      for (let i = 0; i < p.images.length; i++) {
        try {
          const res = await fetch(p.images[i]);
          const blob = await res.blob();
          folder.file(`${slug}-${i + 1}.jpg`, blob);
        } catch { /* skip failed image */ }
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = 'imagenes-inventario.zip'; a.click();
    URL.revokeObjectURL(url);
    showToast('ZIP descargado ✓');
  };

  const buildReportData = () => {
    const now = new Date();
    let rangeStart: Date | null = null;
    if (reportRange !== 'all') {
      rangeStart = new Date(now);
      if (reportRange === 'week') rangeStart.setDate(rangeStart.getDate() - 7);
      else if (reportRange === 'month') rangeStart.setDate(rangeStart.getDate() - 30);
      else if (reportRange === '3months') rangeStart.setDate(rangeStart.getDate() - 90);
    }
    const filtered = sales.filter(s => {
      if (s.status !== 'Vendido') return false;
      if (rangeStart && new Date(s.created_at) < rangeStart) return false;
      if (reportChannel !== 'all' && s.channel !== reportChannel) return false;
      return true;
    });
    const netSales = filtered.reduce((a, s) => a + Number(s.total_price), 0);
    const totalCost = filtered.reduce((a, s) => a + Number(s.total_cost), 0);
    const margin = netSales - totalCost;
    const marginPct = netSales > 0 ? (margin / netSales) * 100 : 0;

    // Filas de detalle: producto, fecha de ingreso, stock restante, canal y fecha de venta
    const detailRows = filtered.map(s => {
      const p = products.find(x => x.id === s.product_id);
      const v = p?.variants.find(x => x.id === s.variant_id);
      return {
        producto: p?.title || '—',
        variante: v ? ([v.talla, v.color, v.material].filter(Boolean).join(' / ') || 'Único') : '—',
        ingreso: p?.created_at ? new Date(p.created_at).toLocaleDateString('es-VE') : '—',
        stockRestante: v ? v.stock : 0,
        canal: s.channel,
        fechaVenta: new Date(s.created_at).toLocaleDateString('es-VE'),
        cantidad: s.quantity,
        total: Number(s.total_price),
      };
    });

    // Progresión en el tiempo por canal (agrupado por semana)
    const byWeek: Record<string, Record<string, number>> = {};
    filtered.forEach(s => {
      const d = new Date(s.created_at);
      const weekKey = `${d.getFullYear()}-S${Math.ceil((d.getDate()) / 7)}-${d.getMonth() + 1}`;
      byWeek[weekKey] = byWeek[weekKey] || {};
      byWeek[weekKey][s.channel] = (byWeek[weekKey][s.channel] || 0) + Number(s.total_price);
    });
    const weekLabels = Object.keys(byWeek).sort();
    const channels = ['Shopify', 'Instagram', 'WhatsApp', 'Persona'];

    // Top y bottom productos por unidades vendidas
    const qtyByProduct: Record<string, number> = {};
    filtered.forEach(s => { qtyByProduct[s.product_id] = (qtyByProduct[s.product_id] || 0) + s.quantity; });
    const ranked = Object.entries(qtyByProduct)
      .map(([pid, qty]) => ({ title: products.find(p => p.id === pid)?.title || '—', qty }))
      .sort((a, b) => b.qty - a.qty);
    const top5 = ranked.slice(0, 5);
    const bottom5 = ranked.slice(-5).reverse();

    return { filtered, netSales, totalCost, margin, marginPct, detailRows, weekLabels, channels, byWeek, top5, bottom5 };
  };

  const generatePDF = async () => {
    if (!products.length && !sales.length) { showToast('No hay datos para el reporte'); return; }
    setPdfGenerating(true);
    try {
      const report = buildReportData();
      const doc = new jsPDF();
      const gold = [184, 147, 90];

      // Encabezado
      doc.setFillColor(184, 147, 90);
      doc.rect(0, 0, 210, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Reporte de Inventario y Ventas', 14, 14);
      doc.setFontSize(9);
      const rangeLabel = { week: 'Última semana', month: 'Último mes', '3months': 'Últimos 3 meses', all: 'Histórico completo' }[reportRange];
      doc.text(`${rangeLabel} · Canal: ${reportChannel === 'all' ? 'Todos' : reportChannel} · ${new Date().toLocaleDateString('es-VE')}`, 14, 20);

      let y = 30;
      doc.setTextColor(40, 36, 28);
      doc.setFontSize(11);
      doc.text(`Ventas netas: $${report.netSales.toFixed(2)}`, 14, y);
      if (reportShowMargin) {
        doc.text(`Margen de ganancia: $${report.margin.toFixed(2)} (${report.marginPct.toFixed(1)}%)`, 14, y + 6);
        y += 6;
      }
      y += 12;

      // Gráfico de progresión (todas las líneas por canal en un solo gráfico)
      if (reportShowChart && report.weekLabels.length > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 900; canvas.height = 420;
        const colors: Record<string, string> = { Shopify: '#95BF47', Instagram: '#C13584', WhatsApp: '#25D366', Persona: '#b8935a' };
        const chart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: report.weekLabels,
            datasets: report.channels.map(ch => ({
              label: ch,
              data: report.weekLabels.map(w => report.byWeek[w]?.[ch] || 0),
              borderColor: colors[ch], backgroundColor: colors[ch], tension: 0.3, fill: false,
            })),
          },
          options: { responsive: false, animation: false, plugins: { legend: { position: 'bottom' } } },
        });
        await new Promise(r => setTimeout(r, 250));
        const imgData = canvas.toDataURL('image/png');
        chart.destroy();
        doc.text('Progresión de ventas por canal', 14, y);
        doc.addImage(imgData, 'PNG', 14, y + 4, 182, 85);
        y += 95;
      }

      // Top / bottom vendidos
      if (reportShowTopBottom && report.top5.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        autoTable(doc, {
          startY: y,
          head: [['Más vendidos', 'Uds.']],
          body: report.top5.map(t => [t.title, String(t.qty)]),
          theme: 'plain', styles: { fontSize: 9 }, headStyles: { fillColor: gold as any },
          margin: { left: 14 }, tableWidth: 88,
        });
        autoTable(doc, {
          startY: y,
          head: [['Menos vendidos', 'Uds.']],
          body: report.bottom5.map(t => [t.title, String(t.qty)]),
          theme: 'plain', styles: { fontSize: 9 }, headStyles: { fillColor: [181, 87, 63] as any },
          margin: { left: 110 }, tableWidth: 88,
        });
        y = (doc as any).lastAutoTable.finalY + 12;
      }

      // Detalle de movimientos
      if (y > 260) { doc.addPage(); y = 20; }
      autoTable(doc, {
        startY: y,
        head: [['Producto', 'Variante', 'Ingreso', 'Stock actual', 'Canal', 'Fecha venta', 'Cant.', 'Total']],
        body: report.detailRows.map(r => [r.producto, r.variante, r.ingreso, String(r.stockRestante), r.canal, r.fechaVenta, String(r.cantidad), `$${r.total.toFixed(2)}`]),
        styles: { fontSize: 8 }, headStyles: { fillColor: gold as any },
      });

      doc.save('reporte-inventario.pdf');
      showToast('PDF descargado ✓');
    } catch (e: any) {
      showToast('Error generando PDF: ' + (e?.message || ''));
    }
    setPdfGenerating(false);
  };
  const handleSale = async () => {
    if (!posProduct || !posVariant) { showToast('Selecciona producto y variante'); return; }
    const p = products.find(x => x.id === posProduct);
    const v = p?.variants.find(x => x.id === posVariant);
    if (!p || !v) return;
    if (v.stock < posQty) { showToast('Stock insuficiente'); return; }
    const newStock = v.stock - posQty;
    const { error: e1 } = await supabase.from('product_variants').update({ stock: newStock }).eq('id', v.id);
    if (e1) { showToast('Error actualizando stock'); return; }
    const { error: e2 } = await supabase.from('sales').insert({
      product_id: p.id, variant_id: v.id, channel: posChannel, status: posAction,
      quantity: posQty, total_price: v.precio * posQty, total_cost: p.cost * posQty,
      client_info: posClient, client_id: posClientId || null,
    });
    if (e2) { showToast('Error registrando venta'); return; }
    showToast(posAction === 'Apartado' ? '📌 Apartado guardado' : '✅ Venta registrada');
    if (posAction === 'Apartado') {
      const varLabel = [v.talla, v.color, v.material].filter(Boolean).join(' ') || 'Único';
      const msg = `Hola! Hemos separado tu pedido: ${posQty}x *${p.title}* (${varLabel}) por $${v.precio * posQty}. ¿Me confirmas?`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
    setPosQty(1); setPosClient('');
    loadData();
  };

  const cancelApartado = async (s: Sale) => {
    if (!confirm('¿Cancelar este apartado y devolver el stock?')) return;
    const p = products.find(x => x.id === s.product_id);
    const v = p?.variants.find(x => x.id === s.variant_id);
    if (v) await supabase.from('product_variants').update({ stock: v.stock + s.quantity }).eq('id', v.id);
    await supabase.from('sales').delete().eq('id', s.id);
    showToast('Apartado cancelado, stock devuelto');
    loadData();
  };

  const completeApartado = async (s: Sale) => {
    await supabase.from('sales').update({ status: 'Vendido' }).eq('id', s.id);
    showToast('¡Venta completada!');
    loadData();
  };

  if (!unlocked) {
    return (
      <div id="root-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24, minHeight: '100vh' }}>
        <img src="/Logo.png" alt="Logo" style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', marginBottom: 8 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Inventario</h1>
        <input value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkPin()}
          placeholder="Código de acceso" style={{ ...inputStyle, textAlign: 'center', width: 220 }} type="password" />
        <button onClick={checkPin} style={{ background: 'linear-gradient(160deg, var(--gold),var(--gold-deep))', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 32px', fontWeight: 700, fontSize: 16 }}>
          Entrar
        </button>
        <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: 0 }}>kreika 2026</p>
      </div>
    );
  }

  const renderInventory = () => (
    <>
      <header style={{ padding: '22px 20px 14px', position: 'sticky', top: 0, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 20, borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <img src="/Logotipo.jpg" style={{ height: 72, objectFit: 'contain', mixBlendMode: 'multiply' }} alt="Logotipo" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em', textAlign: 'center' }}>Inventario</h1>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, textAlign: 'center' }}>
          {loading ? 'Cargando…' : `${products.length} producto${products.length === 1 ? '' : 's'} · ${products.reduce((a, p) => a + totalStock(p), 0)} unidades`}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" style={{ ...inputStyle, textAlign: 'center', flex: 1 }} />
          <button onClick={() => setCardCompact(!cardCompact)} title="Cambiar tamaño de tarjetas"
            style={{ width: 42, height: 42, borderRadius: 12, border: '1px solid var(--line)', background: cardCompact ? 'var(--gold)' : '#fff', color: cardCompact ? '#fff' : 'var(--ink-soft)', flexShrink: 0, fontSize: 16, cursor: 'pointer' }}>
            {cardCompact ? '▦' : '▤'}
          </button>
        </div>
      </header>

      <main style={{ padding: '16px 16px 100px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={exportExcel} style={{ flex: 1, padding: '12px 6px', borderRadius: 12, border: '1px solid var(--gold)', background: '#fff', color: 'var(--gold-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            📥 Excel
          </button>
          <button onClick={downloadAllImages} style={{ flex: 1, padding: '12px 6px', borderRadius: 12, border: '1px solid var(--gold)', background: '#fff', color: 'var(--gold-deep)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
            📸 Fotos (.zip)
          </button>
        </div>

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-soft)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Aún no hay productos</div>
            <div style={{ fontSize: 13 }}>Toca el botón + para agregar el primero</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const stock = totalStock(p);
            const shopify = totalShopify(p);
            const isLow = stock > 0 && stock <= 3;
            const isOut = stock === 0;
            const minPrice = p.variants.length ? Math.min(...p.variants.map(v => v.precio || 0)) : 0;
            const colorList = p.color_mode === 'multiple' ? p.color_values.filter(Boolean) : (p.color_global ? [p.color_global] : []);
            const imgH = cardCompact ? 90 : 150;
            return (
              <div key={p.id} style={{ background: '#fff', border: `1px solid ${isOut ? 'var(--danger)' : isLow ? 'var(--gold)' : 'var(--line)'}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: cardCompact ? 168 : 268 }}>
                <div onClick={() => openExisting(p)} style={{ width: '100%', height: imgH, background: 'var(--nude-soft)', flexShrink: 0, cursor: 'pointer' }}>
                  {p.images[0] ? <img src={p.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={p.title} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📷</div>}
                </div>
                <div onClick={() => openExisting(p)} style={{ padding: cardCompact ? '6px 10px 2px' : '10px 12px 4px', flex: 1, cursor: 'pointer', overflow: 'hidden' }}>
                  <div style={{ fontSize: cardCompact ? 12 : 13.5, fontWeight: 700, marginBottom: 3, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                  {!cardCompact && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-deep)', marginBottom: 4 }}>${minPrice.toFixed(2)}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, fontSize: 10.5, marginBottom: 4 }}>
                    <span style={{ color: isOut ? 'var(--danger)' : isLow ? '#e07a00' : 'var(--ink-soft)', fontWeight: isLow || isOut ? 700 : 500 }}>
                      {isOut ? '❌ 0' : `📦 ${stock}`}
                    </span>
                    {!cardCompact && <span style={{ color: 'var(--ink-soft)' }}>🛒 {shopify}</span>}
                  </div>
                  {!cardCompact && colorList.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {colorList.slice(0, 3).map((c, i) => (
                        <span key={i} style={{ fontSize: 9.5, background: 'var(--nude-soft)', color: 'var(--ink-soft)', padding: '2px 6px', borderRadius: 20 }}>{c}</span>
                      ))}
                      {colorList.length > 3 && <span style={{ fontSize: 9.5, color: 'var(--ink-soft)' }}>+{colorList.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
                  <button onClick={() => openExisting(p)} style={{ flex: 1, border: 'none', background: '#fff', color: 'var(--ink)', fontWeight: 700, fontSize: 11.5, padding: cardCompact ? 6 : 9, cursor: 'pointer' }}>✏️ Editar</button>
                  <div style={{ width: 1, background: 'var(--line)' }} />
                  <button onClick={() => setConfirmModal({ message: `¿Eliminar "${p.title}"?`, onConfirm: async () => { setConfirmModal(null); await supabase.from('product_variants').delete().eq('product_id', p.id); await supabase.from('products').delete().eq('id', p.id); showToast('Producto eliminado'); loadData(); } })}
                    style={{ flex: 1, border: 'none', background: '#fff', color: 'var(--danger)', fontWeight: 700, fontSize: 11.5, padding: cardCompact ? 6 : 9, cursor: 'pointer' }}>🗑️ Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0 8px', fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
          kreika 2026
        </div>
      </main>

      <button onClick={openNew} style={{
        position: 'fixed', bottom: 78, right: 'max(16px, calc(50% - 230px + 16px))', width: 54, height: 54, borderRadius: '50%',
        background: 'linear-gradient(160deg, var(--gold), var(--gold-deep))', color: '#fff', fontSize: 26, border: 'none',
        boxShadow: '0 10px 24px rgba(184,147,90,.5)', cursor: 'pointer', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
    </>
  );

  const renderSales = () => {
    const selProduct = products.find(x => x.id === posProduct);
    return (
      <>
        <header style={{ padding: '22px 20px 14px', background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Vender</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Registra ventas o aparta piezas para clientes</div>
        </header>
        <main style={{ padding: '20px 16px 100px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <label style={labelStyle}>Producto</label>
          <select style={inputStyle} value={posProduct} onChange={e => { setPosProduct(e.target.value); setPosVariant(''); }}>
            <option value="">— Selecciona un producto —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.title} (Stock: {totalStock(p)})</option>)}
          </select>

          {selProduct && (
            <>
              <label style={labelStyle}>Variante</label>
              <select style={inputStyle} value={posVariant} onChange={e => setPosVariant(e.target.value)}>
                <option value="">— Selecciona variante —</option>
                {selProduct.variants.map(v => (
                  <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                    {[v.talla, v.color, v.material].filter(Boolean).join(' / ') || 'Único'} — Stock: {v.stock} — ${v.precio}
                  </option>
                ))}
              </select>
            </>
          )}

          <label style={labelStyle}>Canal de Venta</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {['Shopify', 'Instagram', 'WhatsApp', 'Persona'].map(ch => (
              <button key={ch} onClick={() => setPosChannel(ch)} style={{ padding: '12px 10px', borderRadius: 12, border: `2px solid ${posChannel === ch ? 'var(--gold)' : 'var(--line)'}`, background: posChannel === ch ? 'var(--nude-soft)' : '#fff', color: posChannel === ch ? 'var(--gold-deep)' : 'var(--ink-soft)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {ch === 'Shopify' ? '🛒' : ch === 'Instagram' ? '📸' : ch === 'WhatsApp' ? '💬' : '🏠'} {ch}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cantidad</label>
              <input type="number" min={1} value={posQty} onChange={e => setPosQty(Number(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Acción</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {['Vendido', 'Apartado'].map(a => (
                  <button key={a} onClick={() => setPosAction(a)} style={{ padding: '13px 10px', borderRadius: 12, border: `2px solid ${posAction === a ? 'var(--gold)' : 'var(--line)'}`, background: posAction === a ? 'var(--nude-soft)' : '#fff', color: posAction === a ? 'var(--gold-deep)' : 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    {a === 'Vendido' ? '✅ Vendido' : '📌 Apartar'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label style={labelStyle}>Cliente (Opcional)</label>
          <div style={{ position: 'relative' }}>
            <input type="text" placeholder="Buscar cliente por alias o teléfono…"
              value={clientSearch}
              onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true); if (!e.target.value) { setPosClientId(''); setPosClient(''); } }}
              onFocus={() => setShowClientDropdown(true)}
              style={inputStyle} />
            {showClientDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, marginTop: 4, maxHeight: 220, overflowY: 'auto', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
                {clients.filter(c => (c.alias + c.phone).toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 8).map(c => (
                  <div key={c.id} onClick={() => { setPosClientId(c.id); setPosClient(c.alias); setClientSearch(c.alias); setShowClientDropdown(false); }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--line)', fontSize: 13.5 }}>
                    <div style={{ fontWeight: 700 }}>{c.alias}</div>
                    <div style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{c.country_code} {c.phone}</div>
                  </div>
                ))}
                <div onClick={() => { setShowNewClientForm(true); setShowClientDropdown(false); setNewAlias(clientSearch); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--gold-deep)', fontWeight: 700, fontSize: 13.5 }}>
                  + Crear cliente nuevo
                </div>
              </div>
            )}
          </div>

          {showNewClientForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,10,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ background: '#fff', width: '100%', maxWidth: 460, margin: '0 auto', borderRadius: '20px 20px 0 0', padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Nuevo cliente</h3>
                <label style={labelStyle}>Alias / Nombre</label>
                <input value={newAlias} onChange={e => setNewAlias(e.target.value)} placeholder="Ej. María, cliente Instagram" style={inputStyle} />
                <label style={labelStyle}>País</label>
                <select value={newCountry} onChange={e => setNewCountry(e.target.value)} style={inputStyle}>
                  <option value="+58">🇻🇪 Venezuela (+58)</option>
                  <option value="+57">🇨🇴 Colombia (+57)</option>
                  <option value="+1">🇺🇸 Estados Unidos (+1)</option>
                  <option value="+34">🇪🇸 España (+34)</option>
                  <option value="+51">🇵🇪 Perú (+51)</option>
                  <option value="+593">🇪🇨 Ecuador (+593)</option>
                  <option value="+507">🇵🇦 Panamá (+507)</option>
                  <option value="otro">Otro (escribir código)</option>
                </select>
                {newCountry === 'otro' && (
                  <input value={newCountryCustom} onChange={e => setNewCountryCustom(e.target.value)} placeholder="Ej. +52" style={{ ...inputStyle, marginTop: 8 }} />
                )}
                <label style={labelStyle}>Número de teléfono</label>
                <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ej. 4121234567" style={inputStyle} />
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button onClick={() => setShowNewClientForm(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', fontWeight: 700 }}>Cancelar</button>
                  <button onClick={async () => {
                    if (!newAlias.trim()) { showToast('Ponle un alias al cliente'); return; }
                    const code = newCountry === 'otro' ? (newCountryCustom || '+') : newCountry;
                    const { data, error } = await supabase.from('clients').insert({ alias: newAlias, phone: newPhone, country_code: code }).select().single();
                    if (error || !data) { showToast('Error creando cliente'); return; }
                    setClients([...clients, data]);
                    setPosClientId(data.id); setPosClient(data.alias); setClientSearch(data.alias);
                    setShowNewClientForm(false);
                    setNewAlias(''); setNewPhone(''); setNewCountry('+58'); setNewCountryCustom('');
                    showToast('Cliente creado ✓');
                  }} style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700 }}>Guardar</button>
                </div>
              </div>
            </div>
          )}

          {posVariant && selProduct && (() => {
            const v = selProduct.variants.find(x => x.id === posVariant);
            if (!v) return null;
            const profit = (v.precio - selProduct.cost) * posQty;
            return (
              <div style={{ background: 'var(--nude-soft)', borderRadius: 14, padding: 14, marginTop: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>Resumen</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                  <span>Total venta</span><span>${v.precio * posQty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-soft)' }}>
                  <span>Costo total</span><span>${selProduct.cost * posQty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: profit > 0 ? '#4caf50' : 'var(--danger)', marginTop: 4 }}>
                  <span>Ganancia</span><span>${profit}</span>
                </div>
              </div>
            );
          })()}

          <button onClick={handleSale} style={{ marginTop: 20, padding: 16, borderRadius: 14, border: 'none', background: posAction === 'Vendido' ? 'var(--ink)' : 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {posAction === 'Vendido' ? '✅ Registrar Venta' : '📌 Apartar y avisar por WS'}
          </button>
        </main>
      </>
    );
  };

  const renderMetrics = () => {
    const now = new Date();
    const rangeStart = (() => {
      const d = new Date(now);
      if (reportRange === 'week') d.setDate(d.getDate() - 7);
      else if (reportRange === 'month') d.setDate(d.getDate() - 30);
      else if (reportRange === '3months') d.setDate(d.getDate() - 90);
      else return null;
      return d;
    })();

    const sold = sales.filter(s => s.status === 'Vendido');
    const reserved = sales.filter(s => s.status === 'Apartado');
    const totalRev = sold.reduce((a, b) => a + Number(b.total_price), 0);
    const totalCst = sold.reduce((a, b) => a + Number(b.total_cost), 0);
    const profit = totalRev - totalCst;
    const byChannel = ['Shopify', 'Instagram', 'WhatsApp', 'Persona'].map(ch => ({
      ch, count: sold.filter(s => s.channel === ch).length, rev: sold.filter(s => s.channel === ch).reduce((a, b) => a + Number(b.total_price), 0)
    }));

    return (
      <>
        <header style={{ padding: '22px 20px 14px', background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Métricas</h1>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Resumen financiero y canales de venta</div>
        </header>
        <main style={{ padding: '20px 16px 100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Ingresos', value: `$${totalRev.toFixed(0)}`, sub: `${sold.length} ventas` },
              { label: 'Ganancia', value: `$${profit.toFixed(0)}`, sub: `${totalRev > 0 ? ((profit / totalRev) * 100).toFixed(0) : 0}% margen` },
              { label: 'Apartados', value: String(reserved.length), sub: 'pendientes' },
              { label: 'Productos', value: String(products.length), sub: `${products.reduce((a, p) => a + totalStock(p), 0)} uds.` },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid var(--line)', padding: 14, borderRadius: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Reporte</div>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 20 }}>
            <label style={{ ...labelStyle, margin: '0 0 6px' }}>Periodo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {[
                { id: 'week', label: 'Última semana' },
                { id: 'month', label: 'Último mes' },
                { id: '3months', label: 'Últimos 3 meses' },
                { id: 'all', label: 'Todo (histórico)' },
              ].map(o => (
                <button key={o.id} onClick={() => setReportRange(o.id as any)}
                  style={{ padding: '9px 8px', borderRadius: 10, border: `2px solid ${reportRange === o.id ? 'var(--gold)' : 'var(--line)'}`, background: reportRange === o.id ? 'var(--nude-soft)' : '#fff', color: reportRange === o.id ? 'var(--gold-deep)' : 'var(--ink-soft)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {o.label}
                </button>
              ))}
            </div>
            <label style={{ ...labelStyle, margin: '0 0 6px' }}>Canal de venta</label>
            <select value={reportChannel} onChange={e => setReportChannel(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
              <option value="all">Todos los canales</option>
              <option value="Shopify">Shopify</option>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Persona">Persona</option>
            </select>
            <label style={{ ...labelStyle, margin: '0 0 6px' }}>Incluir en el PDF</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={reportShowMargin} onChange={e => setReportShowMargin(e.target.checked)} /> Margen de ganancia
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={reportShowChart} onChange={e => setReportShowChart(e.target.checked)} /> Gráfico de progresión por canal
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={reportShowTopBottom} onChange={e => setReportShowTopBottom(e.target.checked)} /> Más y menos vendidos
              </label>
            </div>
            <button onClick={generatePDF} disabled={pdfGenerating} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              {pdfGenerating ? 'Generando PDF…' : '📄 Descargar reporte en PDF'}
            </button>
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Por Canal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {byChannel.map(ch => (
              <div key={ch.ch} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {ch.ch === 'Shopify' ? '🛒' : ch.ch === 'Instagram' ? '📸' : ch.ch === 'WhatsApp' ? '💬' : '🏠'} {ch.ch}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-deep)' }}>${ch.rev}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{ch.count} venta{ch.count !== 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Apartados Activos ({reserved.length})</div>
          {reserved.length === 0 ? <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 24px' }}>No hay apartados activos.</p> : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {reserved.map(r => {
              const p = products.find(x => x.id === r.product_id);
              const v = p?.variants.find(x => x.id === r.variant_id);
              return (
                <div key={r.id} style={{ background: '#fff', border: '1px solid var(--gold)', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p?.title || 'Producto'} x{r.quantity}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', margin: '3px 0 8px' }}>
                    {v ? ([v.talla, v.color, v.material].filter(Boolean).join(' ') || 'Único') : ''} · {r.channel} {r.client_info ? `· ${r.client_info}` : ''}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Total: ${r.total_price}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => completeApartado(r)} style={{ flex: 1, padding: 10, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Marcar Vendido</button>
                    <button onClick={() => cancelApartado(r)} style={{ flex: 1, padding: 10, background: '#fff', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✗ Cancelar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </>
    );
  };

  return (
    <div id="root-shell" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>

      {/* Smart App Banner */}
      {!installed && (
      <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logomax.png" alt="Max Ventas" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--line)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>App de Inventario</div>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Instala para mejor experiencia</div>
          </div>
        </div>
        <button onClick={handleInstallClick} style={{ background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {isIOS ? 'Cómo instalar' : 'Instalar'}
        </button>
      </div>
      )}

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'inventario' && renderInventory()}
        {tab === 'vender' && renderSales()}
        {tab === 'metricas' && renderMetrics()}
      </div>

      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,10,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 340, borderRadius: 18, padding: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 20 }}>{confirmModal.message}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', fontWeight: 700 }}>Cancelar</button>
              <button onClick={() => confirmModal.onConfirm()} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {excelPreviewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,10,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 460, margin: '0 auto', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Vista previa del Excel</h3>
              <button onClick={() => setExcelPreviewOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ overflow: 'auto', padding: 12 }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  <tr>
                    {Object.keys(buildExcelRows()[0] || {}).map(k => (
                      <th key={k} style={{ border: '1px solid var(--line)', padding: '5px 8px', background: 'var(--nude-soft)', textAlign: 'left', whiteSpace: 'nowrap' }}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildExcelRows().slice(0, 30).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} style={{ border: '1px solid var(--line)', padding: '5px 8px', whiteSpace: 'nowrap' }}>{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {buildExcelRows().length > 30 && (
                <p style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center', margin: '8px 0' }}>
                  Mostrando 30 de {buildExcelRows().length} filas — el archivo descargado tendrá todas.
                </p>
              )}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
              <button onClick={downloadExcelFile} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700 }}>
                Descargar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Editor Modal */}
      {editorOpen && editing && (
        <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', maxWidth: 460, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
            <button onClick={closeEditor} style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 600, fontSize: 15, padding: 0 }}>Cancelar</button>
            <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>{editing.id ? 'Editar producto' : 'Nuevo producto'}</h2>
            <button onClick={saveProduct} style={{ background: 'none', border: 'none', color: 'var(--gold-deep)', fontWeight: 700, fontSize: 15, padding: 0 }}>Guardar</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Fotos del producto</label>
              <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{editing.images.length}/4 Máx.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {editing.images.map((src, i) => (
                <div key={i} style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden', position: 'relative', border: '1px solid var(--line)', flexShrink: 0 }}>
                  <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', background: 'rgba(43,36,28,.8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer' }}>✕</div>
                </div>
              ))}
              {editing.images.length < 4 && (
                <>
                  <label style={{ width: 76, height: 76, borderRadius: 12, border: '1.5px dashed var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-deep)', fontSize: 24, cursor: 'pointer', background: 'var(--nude-soft)', flexShrink: 0, flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>📷</span>
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { handlePhotos(e.target.files); e.target.value = ''; }} />
                  </label>
                  <label style={{ width: 76, height: 76, borderRadius: 12, border: '1.5px dashed var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-deep)', cursor: 'pointer', background: 'var(--nude-soft)', flexShrink: 0, flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { handlePhotos(e.target.files); e.target.value = ''; }} />
                  </label>
                </>
              )}
            </div>

            {pendingFiles.length > 0 && pendingFiles[pendingIndex] && !cropSrc && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,10,0.92)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, maxWidth: 460, margin: '0 auto' }}>
                <div style={{ color: '#fff', fontSize: 13, marginBottom: 12, opacity: 0.8 }}>
                  Foto {pendingIndex + 1} de {pendingFiles.length}
                </div>
                <img src={pendingFiles[pendingIndex].url} style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 16, objectFit: 'contain' }} alt="Vista previa" />
                <div style={{ display: 'flex', gap: 12, marginTop: 22, width: '100%' }}>
                  <button onClick={cancelPendingPhoto} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,.4)', background: 'transparent', color: '#fff', fontWeight: 700 }}>
                    Descartar
                  </button>
                  <button onClick={confirmPendingPhoto} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700 }}>
                    Continuar y recortar
                  </button>
                </div>
              </div>
            )}

            {cropSrc && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,10,0.94)', zIndex: 310, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, maxWidth: 460, margin: '0 auto' }}>
                <div style={{ color: '#fff', fontSize: 13, marginBottom: 12, opacity: 0.8 }}>Ajusta el recorte</div>
                <div
                  style={{ width: 280, height: 280, borderRadius: 20, overflow: 'hidden', position: 'relative', background: '#111', touchAction: 'none', border: '2px solid var(--gold)' }}
                  onPointerDown={e => { (e.target as any).setPointerCapture(e.pointerId); dragRef.dragging = true; dragRef.startX = e.clientX; dragRef.startY = e.clientY; dragRef.startPos = { ...cropPos }; }}
                  onPointerMove={e => {
                    if (!dragRef.dragging) return;
                    setCropPos({ x: dragRef.startPos.x + (e.clientX - dragRef.startX), y: dragRef.startPos.y + (e.clientY - dragRef.startY) });
                  }}
                  onPointerUp={() => { dragRef.dragging = false; }}
                >
                  <img src={cropSrc} draggable={false}
                    style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: `translate(-50%,-50%) translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropZoom})`,
                      maxWidth: 'none', width: 280, height: 'auto', userSelect: 'none',
                    }} alt="Recortar" />
                </div>
                <div style={{ width: 280, marginTop: 16 }}>
                  <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={e => setCropZoom(Number(e.target.value))} style={{ width: '100%' }} />
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, textAlign: 'center', marginTop: 2 }}>Desliza para zoom · arrastra la foto para moverla</div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, width: '100%' }}>
                  <button onClick={() => setCropSrc(null)} style={{ flex: 1, padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,.4)', background: 'transparent', color: '#fff', fontWeight: 700 }}>
                    Atrás
                  </button>
                  <button onClick={finishCrop} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700 }}>
                    Usar esta foto
                  </button>
                </div>
              </div>
            )}

            <label style={labelStyle}>Título del producto</label>
            <input value={editing.title} onChange={e => updateEditing({ title: e.target.value })} placeholder="Ej. Vestido Camila lino" style={inputStyle} />

            <label style={labelStyle}>¿Cuánto te costó la prenda?</label>
            <input type="number" value={editing.cost === 0 ? '' : editing.cost} placeholder="0.00"
              onChange={e => updateEditing({ cost: e.target.value === '' ? 0 : Number(e.target.value) })} style={inputStyle} />

            <OptionEditor label="Talla" mode={editing.talla_mode} globalVal={editing.talla_global} values={editing.talla_values}
              onModeChange={m => updateOptions({ talla_mode: m })}
              onGlobalChange={v => updateOptions({ talla_global: v })}
              onValuesChange={v => updateOptions({ talla_values: v })} />
            <OptionEditor label="Color" mode={editing.color_mode} globalVal={editing.color_global} values={editing.color_values}
              onModeChange={m => updateOptions({ color_mode: m })}
              onGlobalChange={v => updateOptions({ color_global: v })}
              onValuesChange={v => updateOptions({ color_values: v })} />
            <OptionEditor label="Material" mode={editing.material_mode} globalVal={editing.material_global} values={editing.material_values}
              onModeChange={m => updateOptions({ material_mode: m })}
              onGlobalChange={v => updateOptions({ material_global: v })}
              onValuesChange={v => updateOptions({ material_values: v })} />

            <label style={labelStyle}>Variantes ({editing.variants.length})</label>
            {editing.variants.length > 1 && (
              <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '0 0 8px' }}>
                ¿Alguna combinación no existe? (ej. este color solo viene en una talla) — bórrala con la ✕.
              </p>
            )}
            {editing.variants.map((v, i) => {
              const profit = v.precio - editing.cost;
              return (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                      {[v.talla, v.color, v.material].filter(Boolean).join(' / ') || 'Único'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: profit > 0 ? '#4caf50' : 'var(--danger)', background: profit > 0 ? '#f0fff0' : '#fff0f0', padding: '3px 8px', borderRadius: 20 }}>
                        Ganancia: ${profit}
                      </span>
                      {editing.variants.length > 1 && (
                        <span onClick={() => { const vs = editing.variants.filter((_, idx) => idx !== i); setEditing({ ...editing, variants: vs }); }}
                          style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--nude-soft)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>✕</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 4 }}>STOCK TOTAL</div>
                      <input type="number" value={v.stock === 0 ? '' : v.stock} placeholder="0" onChange={e => {
                        const vs = [...editing.variants]; vs[i] = { ...vs[i], stock: e.target.value === '' ? 0 : Number(e.target.value) };
                        setEditing({ ...editing, variants: vs });
                      }} style={{ ...inputStyle, padding: '10px 8px', fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 4 }}>EN SHOPIFY</div>
                      <input type="number" value={v.shopify_stock === 0 ? '' : v.shopify_stock} placeholder="0" onChange={e => {
                        const vs = [...editing.variants]; vs[i] = { ...vs[i], shopify_stock: e.target.value === '' ? 0 : Number(e.target.value) };
                        setEditing({ ...editing, variants: vs });
                      }} style={{ ...inputStyle, padding: '10px 8px', fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 4 }}>PRECIO VENTA</div>
                      <input type="number" value={v.precio === 0 ? '' : v.precio} placeholder="0" onChange={e => {
                        const vs = [...editing.variants]; vs[i] = { ...vs[i], precio: e.target.value === '' ? 0 : Number(e.target.value) };
                        setEditing({ ...editing, variants: vs });
                      }} style={{ ...inputStyle, padding: '10px 8px', fontSize: 13 }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
            {editing.id && (
              <button onClick={deleteProduct} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--danger)', background: '#fff', color: 'var(--danger)', fontWeight: 700 }}>Eliminar</button>
            )}
            <button onClick={saveProduct} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(160deg,var(--gold),var(--gold-deep))', color: '#fff', fontWeight: 700, fontSize: 15 }}>Guardar producto</button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav style={{ height: 64, background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderTop: '1px solid var(--line)', display: 'flex', flexShrink: 0, zIndex: 40 }}>
        {[
          { id: 'inventario', icon: '📦', label: 'Inventario' },
          { id: 'vender', icon: '🛒', label: 'Vender' },
          { id: 'metricas', icon: '📊', label: 'Métricas' },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id as any)} style={{
            flex: 1, border: 'none', background: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 10, fontWeight: 700,
            color: tab === item.id ? 'var(--gold-deep)' : 'var(--ink-soft)', cursor: 'pointer',
            borderTop: `2px solid ${tab === item.id ? 'var(--gold)' : 'transparent'}`, transition: 'all .15s',
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '11px 22px', borderRadius: 30, fontSize: 13.5, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
