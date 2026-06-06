'use client';
import { useState, useEffect } from 'react';
import { usePulseState } from '@/hooks/usePulseState';
import MonolithPanel from '@/components/MonolithPanel';
import VertexPanel from '@/components/VertexPanel';

const TICKER_ITEMS = [
  { sym: 'MONAD',       val: '4.2071',     chg: '▲0.83%',   up: true  },
  { sym: 'TPS-VTEX',    val: '1,247',      chg: '▲12.4%',   up: true  },
  { sym: 'OCC-RATIO',   val: '0.000',      chg: '▲CLEAN',   up: true  },
  { sym: 'LATENCY-P99', val: '3.2ms',      chg: '▲MEJOR',   up: true  },
  { sym: 'MONO-ERR',    val: 'HIGH',       chg: '▼BLOQ',    up: false },
  { sym: 'CANALES-ACT', val: 'CH-01',      chg: '▲OK',      up: true  },
  { sym: 'SHIELD-POW',  val: 'YUL-INLINE', chg: '▲ACTIVO',  up: true  },
  { sym: 'AEGISNET',    val: 'OK',         chg: '▲PERMISOS', up: true  },
  { sym: 'ETH-GAS',     val: '18.4',       chg: '▼2.1%',    up: false },
  { sym: 'BTC',         val: '98,441',     chg: '▲0.34%',   up: true  },
];

const MENU_ITEMS = [
  ['F1', 'TELEMETRÍA', true],
  ['F2', 'TX LOG',     false],
  ['F3', 'CANALES',    false],
  ['F4', 'OCC ANÁLISIS', false],
  ['F5', 'SHIELD/POW', false],
  ['F8', 'AEGISNET',   false],
  ['F9', 'HISTORIAL',  false],
];

export default function Dashboard() {
  const { monolith, fabric, connected } = usePulseState();
  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('es-CO', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bb-black)', fontFamily: 'var(--bb-font)', fontSize: 12, color: 'var(--bb-green)' }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: 'var(--bb-green)', color: 'var(--bb-black)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', borderBottom: '2px solid var(--bb-green2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span>
            <span style={{ display: 'inline-block', width: 7, height: 7, background: 'var(--bb-black)', borderRadius: '50%', animation: 'blink 1s step-end infinite', verticalAlign: 'middle', marginRight: 4 }} />
            LIVE
          </span>
          <span>BBT-MONAD</span>
          <span>{time}</span>
        </div>
        <div style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: 10 }}>
          ◆ HACKATÓN MONAD BLITZ 2026 — VERTEX A/B TELEMETRÍA ◆
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span>V0.1.0</span>
          <span>WS:LOCALHOST:8080</span>
          <span style={{ animation: 'blink 1s step-end infinite' }}>█</span>
        </div>
      </div>

      {/* ── MENU BAR ── */}
      <div style={{ background: 'var(--bb-bg)', borderBottom: '1px solid var(--bb-border)', display: 'flex', padding: '3px 12px', fontSize: 10, color: 'var(--bb-green2)', flexShrink: 0 }}>
        {MENU_ITEMS.map(([key, label, active]) => (
          <div key={String(key)} style={{ padding: '2px 14px', borderRight: '1px solid var(--bb-border)', letterSpacing: '0.08em', background: active ? 'var(--bb-green-dim)' : 'transparent', color: active ? 'var(--bb-green)' : 'var(--bb-green2)', cursor: 'pointer' }}>
            <span style={{ color: 'var(--bb-amber)', fontWeight: 700 }}>{String(key)}</span>{' '}{String(label)}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', padding: '2px 14px', letterSpacing: '0.08em', cursor: 'pointer', color: 'var(--bb-green2)' }}>
          <span style={{ color: 'var(--bb-amber)', fontWeight: 700 }}>ESC</span> SALIR
        </div>
      </div>

      {/* ── TICKER STRIP ── */}
      <div style={{ background: 'var(--bb-bg2)', borderBottom: '1px solid var(--bb-border2)', overflow: 'hidden', height: 20, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 40, animation: 'ticker 40s linear infinite', whiteSpace: 'nowrap', fontSize: 10, color: 'var(--bb-gray)' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 8 }}>
              <span style={{ color: 'var(--bb-amber)', fontWeight: 600 }}>{item.sym}</span>
              <span style={{ color: 'var(--bb-white)' }}>{item.val}</span>
              <span style={{ color: item.up ? 'var(--bb-green)' : 'var(--bb-red)' }}>{item.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN PANELS ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 2px 1fr', overflow: 'hidden' }}>
        <MonolithPanel state={monolith} connected={connected} />

        {/* Divider */}
        <div style={{ background: 'var(--bb-green-dim)', boxShadow: '0 0 12px rgba(0,255,65,0.3)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bb-black)', padding: '8px 4px', fontSize: 9, color: 'var(--bb-green3)', letterSpacing: '0.2em', writingMode: 'vertical-rl', textOrientation: 'mixed', border: '1px solid var(--bb-green-dim)' }}>
            VS
          </div>
        </div>

        <VertexPanel state={fabric} connected={connected} />
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ background: 'var(--bb-green)', color: 'var(--bb-black)', display: 'flex', justifyContent: 'space-between', padding: '2px 12px', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', flexShrink: 0 }}>
        <span>● WS://LOCALHOST:8080 — {connected ? 'CONECTADO' : 'RECONECTANDO...'}</span>
        <span>SAT 06-JUN-2026  {time}</span>
        <span>MONAD BLITZ 2026 — COPYRIGHT © VERTEX TEAM</span>
      </div>
    </div>
  );
}
