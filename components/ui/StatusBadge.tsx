import React from "react";

type StatusType = "pendente" | "em-progresso" | "concluído" | "erro";

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  className?: string;
}

const statusConfig = {
  pendente: {
    bg: "bg-warning-gold/10",
    border: "border-warning-gold/50",
    color: "text-warning-gold",
    icon: "⏳",
  },
  "em-progresso": {
    bg: "bg-electric-blue/10",
    border: "border-electric-blue/50",
    color: "text-electric-blue",
    icon: "⚙️",
  },
  concluído: {
    bg: "bg-success-green/10",
    border: "border-success-green/50",
    color: "text-success-green",
    icon: "✓",
  },
  erro: {
    bg: "bg-alert-red/10",
    border: "border-alert-red/50",
    color: "text-alert-red",
    icon: "✕",
  },
};

export function StatusBadge({ status, text, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayText = text || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`
        inline-flex items-center gap-2 rounded-full border px-3 py-1
        text-xs font-bold uppercase tracking-widest
        ${config.bg} ${config.border} ${config.color}
        ${className}
      `}
    >
      <span>{config.icon}</span>
      {displayText}
    </span>
  );
}
