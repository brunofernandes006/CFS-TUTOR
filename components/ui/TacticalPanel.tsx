import React from "react";

interface TacticalPanelProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  full?: boolean;
  className?: string;
}

export function TacticalPanel({
  title,
  icon,
  badge,
  children,
  footer,
  full = false,
  className = "",
}: TacticalPanelProps) {
  return (
    <div
      className={`
        border border-graphite rounded-sm bg-navy-900 shadow-lg overflow-hidden
        ${full ? "w-full" : ""}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-graphite bg-navy-800 px-5 py-4">
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0 text-electric-blue">{icon}</div>}
          <h2 className="text-lg font-bold uppercase tracking-widest text-gold-institution">
            {title}
          </h2>
        </div>
        {badge && (
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-electric-blue">
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="border-t border-graphite bg-navy-800 px-5 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
