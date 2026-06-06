'use client';
import { useState, useEffect, useRef } from 'react';
import Sparkline from './ui/Sparkline';
import type { PanelState } from '@/lib/types';

interface Props { state: PanelState; connected: boolean; }

const LOG_MSGS = [
  'OCC collision: slot 0x3a7f — ABORTADO',
  'TX rechazada: conflicto read-write set',
  'Retry #1 fallido — nonce mismatch',
  'Serial lock adquirido: canal único bloqueado',
  'OCC collision: slot 0x1c3b — ABORTADO',
  'Throughput degradado: cola bloqueante activa',
  'TX rechazada: balance stale read detected',
  'OCC collision: slot 0x9f2a — ABORTADO',
  'ERROR: secuencia bloqueada por lock contención',
  'Retry #3 fallido — estado global sucio',
];

type LogCls = 'err' | 'warn' | 'info';
interface LogEntry { time: string; msg: string; cls: LogCls; }

function nowStr() { return new Date().toTimeString().slice(0, 8); }

const S: React.CSSProperties = { fontFamily: 'var(--bb-font)' };

export default function MonolithPanel({ state }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([{ time: '--:--:--', msg: 'Aguardando transacciones...', cls: 'info' }]);
  const logIdxRef = useRef(0);
  const maxTpsRef  = useRef(0);
  const updateRef  = useRef(0);

  if (state.tps > maxTpsRef.current) maxTpsRef.current = state.tps;

  // Generate log entries on every state update
  useEffect(() => {
    updateRef.current++;
    if (updateRef.current <= 1) return;
    if (Math.random() > 0.7) return;
    const cls: LogCls = Math.random() < 0.7 ? 'err' : Math.random() < 0.5 ? 'warn' : 'info';
    const msg = LOG_MSGS[logIdxRef.current % LOG_MSGS.length];
    logIdxRef.current++;
    setLogs(prev => [{ time: nowStr(), msg, cls }, ...prev].slice(0, 30));
  }, [state]);

  // Periodic log even without WS data
  useEffect(() => {
    const id = setInterval(() => {
      if (Math.random() < 0.4) {
        const cls: LogCls = Math.random() < 0.7 ? 'err' : 'warn';
        setLogs(prev => [{ time: nowStr(), msg: LOG_MSGS[logIdxRef.current++ % LOG_MSGS.length], cls }, ...prev].slice(0, 30));
      }
    }, 1200);
    return () => clearInterval(id);
  }, []);

  const colRate  = ((state.errors / Math.max(state.tps, 1)) * 100).toFixed(2);
  const tpsBarW  = Math.min(100, (state.tps       / 500) * 100);
  const errBarW  = Math.min(100, (state.errors    / 400) * 100);
  const latBarW  = Math.min(100, (state.latencyMs / 2000) * 100);

  const STATUS_ROWS = [
    ['MODO EJECUCIÓN',    'SECUENCIAL / BLOQUEANTE',                     'warn'],
    ['OCC STATE',         '● COLISIONES DETECTADAS',                     'err' ],
    ['SHIELD',            'N/A — MODO LEGACY',                           'gray'],
    ['CANALES PARALELOS', 'DESHABILITADO',                               'err' ],
    ['TX TARGET',         'CANCUN / MONAD',                              'gray'],
    ['THROUGHPUT MAX',    maxTpsRef.current > 0 ? `${maxTpsRef.current} TX/s PICO` : '— CALCULANDO', 'warn'],
  ];

  return (
    <div style={{ ...S, background: 'var(--bb-panel)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--bb-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--bb-red)', textShadow: '0 0 12px rgba(255,34,34,0.5)' }}>■ MONOLITH</div>
          <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.1em', marginTop: 2 }}>EJECUCIÓN SECUENCIAL — COLISIÓN OCC TOTAL</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, padding: '2px 8px', border: '1px solid var(--bb-red2)', color: 'var(--bb-red)', background: 'rgba(255,34,34,0.08)', letterSpacing: '0.12em', fontWeight: 600 }}>SECUENCIAL / BLOQUEANTE</div>
          <div style={{ fontSize: 9, color: 'var(--bb-red2)', marginTop: 4, letterSpacing: '0.1em', animation: 'blink 0.8s step-end infinite' }}>● COLISIONES DETECTADAS</div>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--bb-border)', flexShrink: 0 }}>
        <KpiCell label="TPS"          value={state.tps}       unit="tx/s" color="var(--bb-green)" barColor="var(--bb-green3)" barW={tpsBarW} bgAlert={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--bb-gray)', marginTop: 4 }}>
            <span>24H</span><Sparkline value={state.tps} maxVal={500} color="#009922" />
          </div>
        </KpiCell>
        <KpiCell label="ERRORES OCC"  value={state.errors}    unit="err"  color="var(--bb-red)"   barColor="var(--bb-red)"   barW={errBarW} bgAlert>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, marginTop: 4 }}>
            <span style={{ color: 'var(--bb-red2)' }}>CRÍTICO</span><Sparkline value={state.errors} maxVal={400} color="#cc1111" />
          </div>
        </KpiCell>
        <KpiCell label="LATENCIA P50" value={state.latencyMs} unit="ms"   color="var(--bb-amber)" barColor="var(--bb-amber)" barW={latBarW} bgAlert={false} last>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: 'var(--bb-gray)', marginTop: 4 }}>
            <span>P99</span><Sparkline value={state.latencyMs} maxVal={500} color="#cc9200" />
          </div>
        </KpiCell>
      </div>

      {/* Section header */}
      <SectionHeader>◆ DIAGNÓSTICO SISTEMA</SectionHeader>

      {/* Status rows */}
      <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--bb-border)', flexShrink: 0 }}>
        {STATUS_ROWS.map(([key, val, cls]) => (
          <div key={String(key)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--bb-border2)', fontSize: 10 }}>
            <span style={{ color: 'var(--bb-gray)', letterSpacing: '0.1em' }}>{String(key)}</span>
            <span style={{ color: cls === 'err' ? 'var(--bb-red)' : cls === 'warn' ? 'var(--bb-amber)' : 'var(--bb-gray)' }}>{String(val)}</span>
          </div>
        ))}
      </div>

      {/* Log section header */}
      <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--bb-green-dim)', padding: '5px 14px 4px', borderBottom: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.02)', flexShrink: 0, display: 'flex', justifyContent: 'space-between' }}>
        <span>◆ LOG COLISIONES OCC</span>
        <span style={{ color: 'var(--bb-red2)', animation: 'blink 1s step-end infinite' }}>LIVE</span>
      </div>

      {/* Log area */}
      <div style={{ flex: 1, padding: '8px 14px', overflowY: 'auto', fontSize: 10, color: 'var(--bb-gray)' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid var(--bb-border2)', display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--bb-green-dim)', minWidth: 60, flexShrink: 0 }}>{log.time}</span>
            <span style={{ color: log.cls === 'err' ? 'var(--bb-red2)' : log.cls === 'warn' ? 'var(--bb-amber2)' : 'var(--bb-gray)' }}>{log.msg}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: 'var(--bb-bg2)', borderTop: '1px solid var(--bb-border)', padding: '6px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontSize: 10 }}>
        <div>
          <span style={{ color: 'var(--bb-green-dim)' }}>MODO: </span>
          <strong style={{ color: 'var(--bb-white)' }}>OCC SECUENCIAL</strong>
          <span style={{ color: 'var(--bb-green-dim)', marginLeft: 20 }}> COLISIÓN: </span>
          <strong style={{ color: 'var(--bb-red)' }}>{colRate}%</strong>
        </div>
        <div style={{ fontSize: 9, color: 'var(--bb-red)', letterSpacing: '0.1em' }}>
          ACCKEY: <span style={{ color: 'var(--bb-gray)' }}>0x8A3C...D00</span>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCell({ label, value, unit, color, barColor, barW, bgAlert, last, children }: {
  label: string; value: number; unit: string; color: string; barColor: string; barW: number; bgAlert: boolean; last?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '10px 14px', borderRight: last ? 'none' : '1px solid var(--bb-border2)', background: bgAlert ? 'rgba(255,34,34,0.04)' : 'transparent' }}>
      <div style={{ fontSize: 9, color: 'var(--bb-gray)', letterSpacing: '0.15em', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color }}>
        {value}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--bb-gray)', marginLeft: 3 }}>{unit}</span>
      </div>
      <div style={{ height: 2, background: 'var(--bb-border2)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barW}%`, background: barColor, position: 'absolute', left: 0, top: 0, transition: 'width 0.5s' }} />
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--bb-green-dim)', padding: '5px 14px 4px', borderBottom: '1px solid var(--bb-border2)', background: 'rgba(0,255,65,0.02)', flexShrink: 0, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}
