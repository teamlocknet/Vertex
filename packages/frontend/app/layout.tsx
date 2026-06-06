import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vertex — Telemetría A/B en Tiempo Real',
  description: 'Dashboard de colisión OCC: Monolith vs Vertex. Hackatón Monad Blitz 2026.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-black overflow-hidden h-screen">{children}</body>
    </html>
  );
}
