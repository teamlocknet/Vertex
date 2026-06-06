export interface PanelState {
  tps: number;
  errors: number;
  latencyMs: number;
}

export interface TelemetryPayload {
  target: 'monolith' | 'fabric';
  tps: number;
  errors: number;
  latencyMs: number;
}

export type PowStatus = 'idle' | 'calculating' | 'success';
