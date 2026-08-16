import React from "react";

interface Stat {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  status?: "good" | "warning" | "alert";
}

interface StatBlockProps {
  stats: Stat[];
  columns?: number;
  className?: string;
}

const statusBorder = {
  good: "border-l-success-green",
  warning: "border-l-warning-gold",
  alert: "border-l-alert-red",
};

export function StatBlock({
  stats,
  columns = 4,
  className = "",
}: StatBlockProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridCols} ${className}`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`
            rounded-sm border-l-4 border-graphite bg-navy-800 px-4 py-3
            ${statusBorder[stat.status || "good"]}
          `}
        >
          <div className="flex items-center gap-2">
            {stat.icon && (
              <div className="flex-shrink-0 text-lg text-electric-blue">
                {stat.icon}
              </div>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted">
                {stat.label}
              </div>
              <div className="mt-1 text-xl font-bold text-text-primary">
                {stat.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
