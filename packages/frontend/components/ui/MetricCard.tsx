interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  theme: 'red' | 'green';
  intensity?: number;
}

export default function MetricCard({
  label,
  value,
  unit,
  theme,
  intensity = 0,
}: MetricCardProps) {
  const isRed = theme === 'red';

  const r = isRed ? '239, 68, 68' : '0, 255, 136';
  const glowAlpha = (0.25 + intensity * 0.6).toFixed(2);
  const borderAlpha = (0.35 + intensity * 0.55).toFixed(2);
  const innerGlowAlpha = (intensity * 0.15).toFixed(2);

  const textPrimary = isRed ? '#f87171' : '#34d399';
  const textMuted = isRed ? '#fca5a5' : '#6ee7b7';
  const bg = isRed ? 'rgba(20,5,5,0.75)' : 'rgba(5,20,15,0.75)';

  const displayValue =
    value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value.toFixed(0);

  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-lg backdrop-blur-sm transition-all duration-500"
      style={{
        background: bg,
        border: `1px solid rgba(${r}, ${borderAlpha})`,
        boxShadow: [
          `0 0 12px rgba(${r}, ${glowAlpha})`,
          `0 0 28px rgba(${r}, ${(Number(glowAlpha) * 0.5).toFixed(2)})`,
          `inset 0 0 10px rgba(${r}, ${innerGlowAlpha})`,
        ].join(', '),
      }}
    >
      <span
        className="text-[10px] uppercase tracking-widest font-mono transition-colors duration-500"
        style={{ color: textMuted, opacity: 0.7 }}
      >
        {label}
      </span>

      <div className="flex items-baseline gap-1">
        <span
          className="text-2xl font-mono font-bold tabular-nums transition-colors duration-500"
          style={{ color: textPrimary }}
        >
          {displayValue}
        </span>
        <span
          className="text-[10px] font-mono transition-colors duration-500"
          style={{ color: textMuted, opacity: 0.5 }}
        >
          {unit}
        </span>
      </div>

      {/* Barra de intensidad */}
      <div
        className="h-0.5 w-full rounded-full mt-1 transition-all duration-700"
        style={{
          background: `linear-gradient(90deg, rgba(${r},0.8) ${(intensity * 100).toFixed(0)}%, rgba(${r},0.1) ${(intensity * 100).toFixed(0)}%)`,
        }}
      />
    </div>
  );
}
