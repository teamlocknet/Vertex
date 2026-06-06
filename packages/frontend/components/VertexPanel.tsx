'use client';
import dynamic from 'next/dynamic';
import MetricCard from './ui/MetricCard';
import LegitTxButton from './ui/LegitTxButton';
import type { PanelState } from '@/lib/types';

const VertexScene = dynamic(() => import('./three/VertexScene'), { ssr: false });

interface Props {
  state: PanelState;
  connected: boolean;
}

export default function VertexPanel({ state, connected }: Props) {
  const tpsI = Math.min(state.tps       / 500, 1);
  const errI = Math.min(state.errors    / 60,  1);
  const latI = Math.min(state.latencyMs / 300, 1);

  const activeChannels = Math.max(1, Math.ceil(state.tps / 60));
  const panelGlow = `rgba(0,255,136,${(0.05 + tpsI * 0.12).toFixed(2)})`;

  return (
    <div
      className="scanline-overlay relative flex flex-col h-full overflow-hidden transition-all duration-700"
      style={{
        background: 'linear-gradient(140deg, #000a06 0%, #001a0c 55%, #000a06 100%)',
        boxShadow: `inset 0 0 80px ${panelGlow}`,
      }}
    >
      {/* ── Escena 3D de fondo ── */}
      <div className="absolute inset-0 z-0 opacity-65">
        <VertexScene tps={state.tps} />
      </div>

      {/* ── Viñeta radial ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 15%, rgba(0,10,6,0.72) 80%)',
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
                  background: connected ? '#00ff88' : '#4b5563',
                  boxShadow: connected ? '0 0 8px #00ff88' : 'none',
                  animation: connected ? 'neonFade 2s ease-in-out infinite' : 'none',
                }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-500">
                {connected ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            <h2
              className="font-mono text-2xl font-bold tracking-tighter transition-all duration-500"
              style={{
                color: '#00ff88',
                textShadow: `0 0 18px rgba(0,255,136,${(0.3 + tpsI * 0.6).toFixed(2)})`,
              }}
            >
              VERTEX
            </h2>

            <p className="font-mono text-[10px] text-emerald-900/70 mt-0.5 tracking-wide">
              Ejecución Paralela por Canales — Sin Colisión
            </p>
          </div>

          <div
            className="px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-widest transition-all duration-500 flex-shrink-0"
            style={{
              background: 'rgba(6,78,59,0.3)',
              border: `1px solid rgba(0,255,136,${(0.3 + tpsI * 0.5).toFixed(2)})`,
              color: '#6ee7b7',
              boxShadow: `0 0 12px rgba(0,255,136,${(0.2 + tpsI * 0.35).toFixed(2)})`,
            }}
          >
            v0.1.0
          </div>
        </div>

        {/* Divider neon */}
        <div
          className="h-px w-full transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(0,255,136,${(0.3 + tpsI * 0.5).toFixed(2)}), transparent)`,
          }}
        />

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2.5">
          <MetricCard label="TPS"     value={state.tps}       unit="tx/s" theme="green" intensity={tpsI} />
          <MetricCard label="Errores" value={state.errors}    unit="err"  theme="green" intensity={errI} />
          <MetricCard label="Latencia" value={state.latencyMs} unit="ms"  theme="green" intensity={latI} />
        </div>

        {/* Panel de canales */}
        <div
          className="px-3 py-2.5 rounded space-y-1.5 transition-all duration-500"
          style={{
            background: 'rgba(6,78,59,0.18)',
            border: `1px solid rgba(0,255,136,${(0.15 + tpsI * 0.2).toFixed(2)})`,
          }}
        >
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-700 uppercase tracking-widest">Canales Activos</span>
            <span
              className="text-emerald-400 transition-all duration-500"
              style={{ textShadow: `0 0 8px rgba(0,255,136,${(tpsI * 0.7).toFixed(2)})` }}
            >
              CH-01..{String(activeChannels).padStart(2, '0')} ✓
            </span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-700 uppercase tracking-widest">Shield PoW</span>
            <span className="text-emerald-400">ACTIVO (YUL INLINE)</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-700 uppercase tracking-widest">AegisNet</span>
            <span className="text-emerald-400">PERMISOS OK</span>
          </div>

          {/* Mini barra de canales */}
          <div className="flex gap-0.5 mt-1 pt-1 border-t border-emerald-900/30">
            {Array.from({ length: Math.min(activeChannels, 12) }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-sm transition-all duration-700"
                style={{
                  background: `rgba(0,255,136,${(0.4 + (i / 12) * 0.5).toFixed(2)})`,
                  boxShadow: `0 0 4px rgba(0,255,136,0.5)`,
                }}
              />
            ))}
            {Array.from({ length: Math.max(0, 12 - activeChannels) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex-1 h-1 rounded-sm"
                style={{ background: 'rgba(0,255,136,0.08)' }}
              />
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {/* Botón Juez */}
        <LegitTxButton />

        {/* Leyenda de estado */}
        <div className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-900/50">MODO</span>
            <span className="text-emerald-700">PARALELO / NO BLOQUEANTE</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-900/50">PARTICIÓN</span>
            <span className="text-emerald-700">uint128 balance + uint64 nonce</span>
          </div>
          <div className="flex justify-between font-mono text-[10px]">
            <span className="text-emerald-900/50">EVM TARGET</span>
            <span className="text-emerald-700">CANCUN / MONAD</span>
          </div>
        </div>

        <div className="h-px w-full" style={{ background: 'rgba(0,255,136,0.1)' }} />
        <p className="font-mono text-[9px] text-emerald-950/50 text-center tracking-widest uppercase">
          VertexCore.sol — Slots Disjuntos 256-bit — GasAuditor + PulseState
        </p>
      </div>
    </div>
  );
}
