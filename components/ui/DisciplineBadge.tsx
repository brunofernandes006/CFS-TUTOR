import React from "react";

interface DisciplineBadgeProps {
  discipline: string;
  size?: "small" | "medium";
  className?: string;
}

const disciplineConfig: Record<string, { bg: string; border: string; color: string }> = {
  "Língua Portuguesa": {
    bg: "bg-electric-blue/20",
    border: "border-electric-blue",
    color: "text-electric-blue",
  },
  Português: {
    bg: "bg-electric-blue/20",
    border: "border-electric-blue",
    color: "text-electric-blue",
  },
  "Matemática e Raciocínio Lógico": {
    bg: "bg-success-green/20",
    border: "border-success-green",
    color: "text-success-green",
  },
  Matemática: {
    bg: "bg-success-green/20",
    border: "border-success-green",
    color: "text-success-green",
  },
  "Conhecimentos Profissionais": {
    bg: "bg-gold-institution/20",
    border: "border-gold-institution",
    color: "text-gold-institution",
  },
  Profissionais: {
    bg: "bg-gold-institution/20",
    border: "border-gold-institution",
    color: "text-gold-institution",
  },
};

const fallbackConfig = {
  bg: "bg-navy-800",
  border: "border-graphite",
  color: "text-text-muted",
};

const sizeConfig = {
  small: "px-2 py-1 text-xs",
  medium: "px-3 py-2 text-sm",
};

export function DisciplineBadge({
  discipline,
  size = "medium",
  className = "",
}: DisciplineBadgeProps) {
  const config = disciplineConfig[discipline] ?? fallbackConfig;
  const sizeClass = sizeConfig[size];

  return (
    <span
      className={`
        inline-block rounded-md border font-bold
        ${sizeClass}
        ${config.bg} ${config.border} ${config.color}
        ${className}
      `}
    >
      {discipline}
    </span>
  );
}
