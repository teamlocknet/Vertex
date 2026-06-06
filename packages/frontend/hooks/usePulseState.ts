'use client';
import { useState, useEffect, useRef } from 'react';
import type { PanelState, TelemetryPayload } from '@/lib/types';

const DEFAULT: PanelState = { tps: 0, errors: 0, latencyMs: 0 };
const WS_URL = 'ws://localhost:8080';
const RECONNECT_DELAY_MS = 2000;

export function usePulseState() {
  const [monolith, setMonolith] = useState<PanelState>(DEFAULT);
  const [fabric, setFabric] = useState<PanelState>(DEFAULT);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!unmountedRef.current) setConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (unmountedRef.current) return;
        try {
          const payload = JSON.parse(event.data as string) as TelemetryPayload;
          const next: PanelState = {
            tps: payload.tps ?? 0,
            errors: payload.errors ?? 0,
            latencyMs: payload.latencyMs ?? 0,
          };
          if (payload.target === 'monolith') setMonolith(next);
          else if (payload.target === 'fabric') setFabric(next);
        } catch {
          /* ignorar mensajes malformados */
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setConnected(false);
        retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { monolith, fabric, connected };
}
