import React from "react";

interface TacticalCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  bordered?: boolean;
  compact?: boolean;
  alert?: "error" | "warning" | "success" | "info";
  className?: string;
}

export function TacticalCard({
  title,
  subtitle,
  children,
  bordered = true,
  compact = false,
  alert,
  className = "",
}: TacticalCardProps) {
  const borderColor = {
    error: "border-l-red-500",
    warning: "border-l-yellow-500",
    success: "border-l-green-500",
    info: "border-l-blue-500",
  }[alert || "info"];

  const padding = compact ? "p-3" : "p-5";

  return (
    <div
      className={`
        ${bordered ? `border border-graphite ${borderColor} border-l-4` : ""}
        rounded-sm bg-navy-900 shadow-lg
        ${padding}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-bold uppercase tracking-widest text-gold-institution">
              {title}
            </h3>
          )}
          {subtitle && <p className="mt-1 text-sm text-silver">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
