'use client';
import { useEffect, useRef } from 'react';
import Sparkline from './ui/Sparkline';
import LegitTxButton from './ui/LegitTxButton';
import type { PanelState } from '@/lib/types';

interface Props { state: PanelState; connected: boolean; }

function drawChart(canvas: HTMLCanvasElement, history: number[], maxVal: number) {
  const parent = canvas.parentElement;
  canvas.width  = parent ? parent.clientWidth : 400;
  canvas.height = 130;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Grid lines
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * H;
    ctx.strokeStyle = '#0f2a0f';
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    if (i < 4) {
      ctx.fillStyle = '#1a3a1a';
      ctx.font = '9px monospace';
      ctx.fillText(Math.round((1 - i / 4) * maxVal).toLocaleString(), 2, y + 10);
    }
  }

  if (history.length < 2) return;

  const points = history.map((v, i) => ({
    x: (i / (history.length - 1)) * W,
    y: H - (v / maxVal) * H * 0.9 - 4,
  }));

  // Line
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = '#00ff41';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00ff41';
  ctx.shadowBlur = 4;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill
  const last = points[points.length - 1];
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(last.x, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = 'rgba(0,255,65,0.04)';
  ctx.fill();

  // End dot
  ctx.beginPath();
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#00ff41';
  ctx.shadowColor = '#00ff41';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
}

const S: React.CSSProperties = { fontFamily: 'var(--bb-font)' };

export default function VertexPanel({ state }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const maxTpsRef  = useRef(0);

  if (state.tps > maxTpsRef.current) maxTpsRef.current = state.tps;

  useEffect(() => {
    historyRef.current = [...historyRef.current, state.tps].slice(-60);
    if (canvasRef.current) {
      drawChart(canvasRef.current, historyRef.current, Math.max(maxTpsRef.current, 100));
    }
  }, [state.tps]);

  const activeChannels = Math.max(1, Math.ceil(state.tps / 60));
  const tpsBarW = Math.min(100, (state.tps       / 2000) * 100);
  const errBarW = Math.min(100, (state.errors    /  200) * 100);
  const latBarW = Math.min(100, (state.latencyMs /   50) * 100);
  const colRate = ((state.errors / Math.max(state.tps, 1)) * 100).toFixed(3);

  const STATUS_ROWS = [
    ['CANALES ACTIVOS',    `CH-01..${String(activeChannels).padStart(2, '0')} ✓`, 'ok'],
    ['SHIELD POW',         'ACTIVO (YUL INLINE)',                                 'ok'],
    ['AEGISNET',           '● PERMISOS OK',                                       'ok'],
    ['EJECUCIÓN PARALELA', 'uint128 balance + uint64 nonce',                      'ok'],
    ['TX TARGET',          'CANCUN / MONAD',                                      'ok'],
    ['THROUGHPUT MAX',     maxTpsRef.current > 0 ? `${maxTpsRef.current.toLocaleString()} TX/s PICO` : '— CALCULANDO', 'ok'],
  ];

  return (
    <div style={{ ...S, background: 'var(--bb-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--bb-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--bb-green)', textShadow: '0 0 12px rgba(0,255,65,0.5)' }}>▶ VERTEX</div>
          <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.1em', marginTop: 2 }}>EJECUCIÓN PARALELA POR CANALES — SIN COLISIÓN</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--bb-green3)', color: 'var(--bb-green)', background: 'rgba(0,255,65,0.06)', letterSpacing: '0.12em', fontWeight: 600 }}>PARALELO / NO BLOQUEANTE</div>
          <div style={{ fontSize: 9, color: 'var(--bb-green2)', marginTop: 4, letterSpacing: '0.1em' }}>● SISTEMA OPERACIONAL</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--bb-border)', flexShrink: 0 }}>
        {/* TPS */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.04)' }}>
          <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>TPS</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--bb-green)', textShadow: '0 0 12px rgba(0,255,65,0.4)' }}>
            {state.tps.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--bb-gray)', marginLeft: 3 }}>tx/s</span>
          </div>
          <div style={{ height: 2, background: 'var(--bb-border2)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${tpsBarW}%`, background: 'var(--bb-green)', position: 'absolute', left: 0, top: 0, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--bb-gray)', marginTop: 4 }}>
            <span>24H</span><Sparkline value={state.tps} maxVal={2000} color="#00cc33" />
          </div>
        </div>

        {/* Errores */}
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.04)', boxShadow: '0 0 8px rgba(0,255,65,0.1) inset' }}>
          <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>ERRORES OCC</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--bb-red)', textShadow: '0 0 16px rgba(255,34,34,0.6)' }}>
            {state.errors}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--bb-gray)', marginLeft: 3 }}>err</span>
          </div>
          <div style={{ height: 2, background: 'var(--bb-border2)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${errBarW}%`, background: 'var(--bb-amber)', position: 'absolute', left: 0, top: 0, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--bb-amber)', marginTop: 4 }}>
            <span>RESOLVIENDO</span><Sparkline value={state.errors} maxVal={200} color="#cc9200" />
          </div>
        </div>

        {/* Latencia */}
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>LATENCIA P50</div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: 'var(--bb-green)', textShadow: '0 0 12px rgba(0,255,65,0.4)' }}>
            {state.latencyMs}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--bb-gray)', marginLeft: 3 }}>ms</span>
          </div>
          <div style={{ height: 2, background: 'var(--bb-border2)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${latBarW}%`, background: 'var(--bb-green)', position: 'absolute', left: 0, top: 0, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--bb-gray)', marginTop: 4 }}>
            <span>P99</span><Sparkline value={state.latencyMs} maxVal={50} color="#00cc33" />
          </div>
        </div>
      </div>

      {/* Status section */}
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--bb-green-dim)', padding: '5px 14px 4px', borderBottom: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.02)', flexShrink: 0 }}>
        ◆ ESTADO CANALES Y SHIELDS
      </div>
      <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--bb-border)', flexShrink: 0 }}>
        {STATUS_ROWS.map(([key, val]) => (
          <div key={String(key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--bb-border2)', fontSize: 10 }}>
            <span style={{ color: 'var(--bb-gray)', letterSpacing: '0.1em' }}>{String(key)}</span>
            <span style={{ color: 'var(--bb-green)' }}>{String(val)}</span>
          </div>
        ))}
      </div>

      {/* Chart section */}
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--bb-green-dim)', padding: '5px 14px 4px', borderBottom: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.02)', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
        <span>◆ TPS TIEMPO REAL</span>
        <span style={{ color: 'var(--bb-green2)', animation: 'blink 1.2s step-end infinite' }}>LIVE</span>
      </div>
      <div style={{ flex: 1, padding: '8px 14px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--bb-gray)', marginBottom: 6 }}>
          <span>TPS/s — VENTANA 60s</span>
          <span style={{ color: 'var(--bb-green)' }}>MAX: {maxTpsRef.current.toLocaleString()}</span>
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      </div>

      {/* TX Button */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--bb-border)', flexShrink: 0 }}>
        <LegitTxButton />
      </div>

      {/* Footer */}
      <div style={{ background: 'var(--bb-bg2)', borderTop: '1px solid var(--bb-border)', padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontSize: 10 }}>
        <div>
          <span style={{ color: 'var(--bb-green-dim)' }}>MODO: </span>
          <strong style={{ color: 'var(--bb-white)' }}>PARALELO / NO BLOQUEANTE</strong>
          <span style={{ color: 'var(--bb-green-dim)', marginLeft: 20 }}> OCC-RATE: </span>
          <strong style={{ color: 'var(--bb-green)' }}>{colRate}%</strong>
        </div>
        <div style={{ fontSize: 9, color: 'var(--bb-green2)', letterSpacing: '0.1em' }}>
          SHIELD: <span style={{ color: 'var(--bb-gray)' }}>ACTIVO</span>
        </div>
      </div>
    </div>
  );
}
