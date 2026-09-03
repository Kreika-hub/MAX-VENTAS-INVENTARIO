import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function generateOrderNumber(count: number): string {
  const prefix = 'MAX';
  const number = count + 1;
  return `${prefix}-${String(number).padStart(6, '0')}`;
}
