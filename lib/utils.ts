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

export function generateOrderNumber(count: number): string {
  const prefix = 'MAX';
  const number = count + 1;
  return `${prefix}-${String(number).padStart(6, '0')}`;
}
