import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MAX VENTAS | Tienda Oficial',
  description: 'Tienda en línea de MAX VENTAS con envíos a todo Estados Unidos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-white text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
