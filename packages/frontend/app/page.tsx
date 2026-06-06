'use client';
import { usePulseState } from '@/hooks/usePulseState';
import MonolithPanel from '@/components/MonolithPanel';
import VertexPanel from '@/components/VertexPanel';

export default function Dashboard() {
  const { monolith, fabric, connected } = usePulseState();

  return (
    <main className="flex h-screen w-screen overflow-hidden relative">

      {/* ── Panel izquierdo: Monolito ── */}
      <div
        className="w-1/2 h-full"
        style={{ borderRight: '1px solid rgba(120,0,0,0.4)' }}
      >
        <MonolithPanel state={monolith} connected={connected} />
      </div>

      {/* ── Separador central con halo bicolor ── */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 bottom-0 w-px z-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(180,180,180,0.4) 15%, rgba(180,180,180,0.4) 85%, transparent 100%)',
          boxShadow: [
            '0 0 12px rgba(180,180,180,0.2)',
            '-6px 0 18px rgba(220,38,38,0.25)',
            '6px 0 18px rgba(0,255,136,0.25)',
          ].join(', '),
          transform: 'translateX(-50%)',
        }}
      />

      {/* ── Etiqueta central flotante ── */}
      <div
        aria-hidden
        className="absolute left-1/2 top-4 z-40 pointer-events-none"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div
          className="px-3 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest whitespace-nowrap"
          style={{
            background: 'rgba(5,5,5,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(8px)',
          }}
        >
          Hackatón Monad Blitz 2026 — Vertex A/B Telemetría
        </div>
      </div>

      {/* ── Panel derecho: Vertex ── */}
      <div className="w-1/2 h-full">
        <VertexPanel state={fabric} connected={connected} />
      </div>

      {/* ── Indicador global de conexión ── */}
      <div
        className="absolute bottom-3 left-1/2 z-40 pointer-events-none"
        style={{ transform: 'translateX(-50%)' }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] uppercase tracking-widest"
          style={{
            background: 'rgba(5,5,5,0.8)',
            border: `1px solid ${connected ? 'rgba(0,255,136,0.2)' : 'rgba(100,100,100,0.2)'}`,
            color: connected ? 'rgba(0,255,136,0.5)' : 'rgba(100,100,100,0.5)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: connected ? '#00ff88' : '#6b7280',
              boxShadow: connected ? '0 0 6px #00ff88' : 'none',
            }}
          />
          ws://localhost:8080 — {connected ? 'Conectado' : 'Reconectando...'}
        </div>
      </div>

    </main>
  );
}
