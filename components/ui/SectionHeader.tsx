import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div
      className={`
        mb-6 flex items-center justify-between gap-4
        ${className}
      `}
    >
      <div className="flex items-baseline gap-4">
        {icon && <div className="flex-shrink-0 text-cyan-glow text-2xl">{icon}</div>}
        <div>
          <h1 className="text-4xl font-black uppercase tracking-widest text-cyan-glow">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-silver">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
