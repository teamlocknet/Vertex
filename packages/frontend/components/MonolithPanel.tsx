'use client';
import dynamic from 'next/dynamic';
import MetricCard from './ui/MetricCard';
import type { PanelState } from '@/lib/types';

const MonolithScene = dynamic(() => import('./three/MonolithScene'), { ssr: false });

interface Props {
  state: PanelState;
  connected: boolean;
}

export default function MonolithPanel({ state, connected }: Props) {
  const errI  = Math.min(state.errors / 60, 1);
  const tpsI  = Math.min(state.tps   / 500, 1);
  const latI  = Math.min(state.latencyMs / 300, 1);

  const panelGlow = `rgba(220,38,38,${(0.08 + errI * 0.18).toFixed(2)})`;

  return (
    <div
      className="scanline-overlay relative flex flex-col h-full overflow-hidden transition-all duration-700"
      style={{
        background: 'linear-gradient(140deg, #0a0000 0%, #180000 55%, #0a0000 100%)',
        boxShadow: `inset 0 0 80px ${panelGlow}`,
      }}
    >
      {/* ── Escena 3D de fondo ── */}
      <div className="absolute inset-0 z-0 opacity-70">
        <MonolithScene errors={state.errors} />
      </div>

      {/* ── Viñeta radial ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 15%, rgba(10,0,0,0.72) 80%)',
        }}
      />

      {/* ── Contenido ── */}
      <div className="relative z-10 flex flex-col h-full p-6 gap-4">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500"
                style={{
                  background: connected ? '#ef4444' : '#4b5563',
                  boxShadow: connected ? `0 0 8px #ef4444` : 'none',
                }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500">
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <h2
              className="font-mono text-2xl font-bold tracking-tighter transition-all duration-500"
              style={{
                color: '#dc2626',
                textShadow: `0 0 18px rgba(220,38,38,${(0.3 + errI * 0.6).toFixed(2)})`,
                animation: errI > 0.7 ? 'glitch 0.25s steps(1) infinite' : 'none',
              }}
            >
              MONOLITH
            </h2>

            <p className="font-mono text-[10px] text-red-900/70 mt-0.5 tracking-wide">
              Ejecución Secuencial — Colisión OCC Total
            </p>
          </div>

          <div
            className="px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-widest transition-all duration-500 flex-shrink-0"
            style={{
              background: 'rgba(127,29,29,0.3)',
              border: `1px solid rgba(220,38,38,${(0.3 + errI * 0.5).toFixed(2)})`,
              color: '#fca5a5',
              boxShadow: errI > 0.4 ? `0 0 12px rgba(239,68,68,${(errI * 0.4).toFixed(2)})` : 'none',
            }}
          >
            LEGACY
          </div>
        </div>

        {/* Divider neon */}
        <div
          className="h-px w-full transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(220,38,38,${(0.3 + errI * 0.5).toFixed(2)}), transparent)`,
          }}
        />

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2.5">
          <MetricCard label="TPS"     value={state.tps}       unit="tx/s" theme="red" intensity={tpsI} />
          <MetricCard label="Errores" value={state.errors}    unit="err"  theme="red" intensity={errI} />
          <MetricCard label="Latencia" value={state.latencyMs} unit="ms"  theme="red" intensity={latI} />
        </div>

        {/* Alerta de colisión */}
        {state.errors > 15 && (
          <div
            className="px-3 py-2 rounded font-mono text-[11px] text-center transition-all duration-500"
            style={{
              background: 'rgba(127,29,29,0.38)',
              border: '1px solid rgba(239,68,68,0.55)',
              color: '#fca5a5',
              animation: 'neonFade 1s ease-in-out infinite',
              boxShadow: '0 0 12px rgba(239,68,68,0.25)',
            }}
          >
            ⚠ COLISIÓN OCC — {state.errors} TX REVERTIDAS EN BLOQUE
          </div>
        )}

        <div className="flex-1" />

        {/* Leyenda de estado */}
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-red-900/50">MODO</span>
            <span className="text-red-700">SECUENCIAL / BLOQUEANTE</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-red-900/50">OCC</span>
            <span className="text-red-700">COLISIONES DETECTADAS</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-red-900/50">SHIELD</span>
            <span className="text-red-900/40">INACTIVO</span>
          </div>
        </div>

        <div className="h-px w-full" style={{ background: 'rgba(220,38,38,0.1)' }} />
        <p className="font-mono text-[9px] text-red-950/50 text-center tracking-widest uppercase">
          MonolithDemo.sol — Almacenamiento Plano Saturable
        </p>
      </div>
    </div>
  );
}
