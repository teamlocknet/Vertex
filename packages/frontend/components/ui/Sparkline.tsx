'use client';
import { useRef, useState, useEffect } from 'react';

interface Props {
  value: number;
  maxVal: number;
  color: string;
}

export default function Sparkline({ value, maxVal, color }: Props) {
  const [mounted, setMounted] = useState(false);
  const histRef = useRef<number[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    histRef.current = [...histRef.current, value].slice(-30);
  }, [value]);

  const W = 80, H = 20;

  // Always render empty SVG on server and during hydration — guarantees
  // server HTML matches the first client render. The polyline only appears
  // after mount, which is past the hydration boundary.
  if (!mounted) return <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, height: H }} />;

  const data = histRef.current;
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
