import React from "react";

interface SourceBadgeProps {
  type: "OFICIAL" | "INÉDITA" | "DIDÁTICA";
  className?: string;
}

const typeConfig = {
  OFICIAL: {
    bg: "bg-gold-institution/20",
    border: "border-gold-institution",
    color: "text-gold-institution",
  },
  INÉDITA: {
    bg: "bg-electric-blue/20",
    border: "border-electric-blue",
    color: "text-electric-blue",
  },
  DIDÁTICA: {
    bg: "bg-success-green/20",
    border: "border-success-green",
    color: "text-success-green",
  },
};

export function SourceBadge({ type, className = "" }: SourceBadgeProps) {
  const config = typeConfig[type];

  return (
    <span
      className={`
        inline-block rounded-md border px-2 py-1 text-xs font-bold uppercase
        tracking-widest
        ${config.bg} ${config.border} ${config.color}
        ${className}
      `}
    >
      {type}
    </span>
  );
}
