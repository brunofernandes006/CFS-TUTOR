interface ProgressBarProps {
  value: number;       // 0–100
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  color = "var(--gold)",
  height = 6,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--muted)" }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: "var(--navy-3)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
