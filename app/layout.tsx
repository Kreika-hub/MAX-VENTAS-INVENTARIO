import './globals.css';

export const metadata = {
  title: 'Inventario',
  description: 'Inventario de tienda',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#b8935a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/logomax.png" />
        <link rel="apple-touch-icon" href="/logomax.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
