import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | string | null | undefined): string {
  const num = typeof price === 'number' ? price : parseFloat(String(price ?? 0));
  const validNum = isNaN(num) ? 0 : num;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(validNum);
}

export function resolvePrice(product: any): number {
  if (!product) return 0;
  
  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const p = parseFloat(val);
      return isNaN(p) ? 0 : p;
    }
    return 0;
  };

  const productPrice = parseNum(product.price);
  if (productPrice > 0) return productPrice;

  if (Array.isArray(product.product_variants) && product.product_variants.length > 0) {
    const firstVariantPrice = parseNum(product.product_variants[0]?.precio);
    if (firstVariantPrice > 0) return firstVariantPrice;

    // Si la primera no tiene, buscar si alguna otra variante tiene precio
    for (const variant of product.product_variants) {
      const vPrice = parseNum(variant?.precio);
      if (vPrice > 0) return vPrice;
    }
  }

  const precioField = parseNum(product.precio);
  if (precioField > 0) return precioField;

  const cost = parseNum(product.cost);
  if (cost > 0) return cost * 2;

  return 0;
}

export function generateOrderNumber(count: number): string {
  const prefix = 'MAX';
  const number = count + 1;
  return `${prefix}-${String(number).padStart(6, '0')}`;
}
