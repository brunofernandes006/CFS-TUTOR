import React from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "alert";
  trend?: "up" | "down" | "stable";
  onChange?: number;
  compact?: boolean;
  className?: string;
}

const statusColor = {
  good: "border-l-green-500",
  warning: "border-l-yellow-500",
  alert: "border-l-red-500",
};

const trendIcon = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const trendColor = {
  up: "text-green-500",
  down: "text-red-500",
  stable: "text-blue-500",
};

export function MetricCard({
  label,
  value,
  unit,
  status = "good",
  trend,
  onChange,
  compact = false,
  className = "",
}: MetricCardProps) {
  const padding = compact ? "p-3" : "p-4";

  return (
    <div
      className={`
        border border-l-4 border-graphite ${statusColor[status]} rounded-sm
        bg-navy-800 shadow-md
        ${padding}
        text-center
        ${className}
      `}
    >
      <div className="text-xs font-bold uppercase tracking-widest text-silver">
        {label}
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <div className="text-2xl font-bold text-text-primary">
          {value}
          {unit && <span className="text-sm">{unit}</span>}
        </div>
        {trend && (
          <div className={`text-lg font-bold ${trendColor[trend]}`}>
            {trendIcon[trend]}
          </div>
        )}
      </div>
      {onChange !== undefined && (
        <div className="mt-1 text-xs text-silver">
          {onChange > 0 ? "+" : ""}
          {onChange} vs anterior
        </div>
      )}
    </div>
  );
}
