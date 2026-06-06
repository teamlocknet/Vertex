'use client';
import { useRef } from 'react';

interface Props {
  value: number;
  maxVal: number;
  color: string;
}

export default function Sparkline({ value, maxVal, color }: Props) {
  const histRef = useRef<number[]>([]);
  histRef.current = [...histRef.current, value].slice(-30);
  const data = histRef.current;
  const W = 80, H = 20;
  if (data.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, height: H }} />;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - Math.min(v / Math.max(maxVal, 1), 1) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, height: H }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" opacity="0.8" />
    </svg>
  );
}
