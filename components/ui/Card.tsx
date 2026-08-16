import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ background: "var(--navy-2)", borderColor: "var(--border)", ...style }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--muted)" }}>
      {children}
    </h3>
  );
}
