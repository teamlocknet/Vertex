import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const ibmMono = IBM_Plex_Mono({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ibm',
});

export const metadata: Metadata = {
  title: 'VERTEX A/B TELEMETRÍA — HACKATÓN MONAD BLITZ 2026',
  description: 'Dashboard colisión OCC: Monolith vs Vertex. Hackatón Monad Blitz 2026.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={ibmMono.variable}>
      <body>{children}</body>
    </html>
  );
}
