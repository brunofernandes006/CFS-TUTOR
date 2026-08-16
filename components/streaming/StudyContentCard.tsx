"use client";

import React from "react";

type Variant = "syllabus" | "document" | "review" | "mission" | "simulation" | "question" | "weakness";

export interface StudyContentCardProps {
  variant: Variant;
  title: string;
  subtitle?: string;
  discipline?: string;
  progress?: number;
  mastery?: number;
  badge?: string;
  badgeColor?: "gold" | "blue" | "red" | "green";
  icon?: string;
  onClick?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  onPreview?: () => void;
  onListToggle?: () => void;
  inList?: boolean;
  compact?: boolean;
  animate?: boolean;
}

const variantGradients: Record<Variant, string> = {
  syllabus: "from-electric-blue/5 to-transparent",
  document: "from-cyan-glow/5 to-transparent",
  review: "from-warning-gold/5 to-transparent",
  mission: "from-gold-institution/5 to-transparent",
  simulation: "from-alert-red/5 to-transparent",
  question: "from-electric-blue/5 to-transparent",
  weakness: "from-alert-red/5 to-transparent",
};

const variantAccent: Record<Variant, string> = {
  syllabus: "text-electric-blue",
  document: "text-cyan-glow",
  review: "text-warning-gold",
  mission: "text-gold-institution",
  simulation: "text-alert-red",
  question: "text-electric-blue",
  weakness: "text-alert-red",
};

const badgeColorMap = {
  gold: "bg-gold-institution/15 text-gold-institution border-gold-institution/30",
  blue: "bg-electric-blue/15 text-electric-blue border-electric-blue/30",
  red: "bg-alert-red/15 text-alert-red border-alert-red/30",
  green: "bg-success-green/15 text-success-green border-success-green/30",
};

export function StudyContentCard({
  variant,
  title,
  subtitle,
  discipline,
  progress,
  mastery,
  badge,
  badgeColor = "gold",
  icon,
  onClick,
  onAction,
  actionLabel,
  onPreview,
  onListToggle,
  inList = false,
  compact = false,
  animate = false,
}: StudyContentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-full text-left rounded-xl border border-graphite/40
        bg-navy-900 overflow-visible
        transition-all duration-[200ms] ease-out
        hover:scale-[1.06] hover:z-30 hover:border-graphite/70
        hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(0,180,255,0.08)]
        focus-visible:scale-[1.06] focus-visible:z-30
        focus:outline-none focus:ring-2 focus:ring-electric-blue/40
        ${compact ? "p-3" : "p-4 sm:p-5"}
        ${onClick ? "cursor-pointer" : "cursor-default"}
        ${animate ? "animate-fade-in-up" : ""}
      `}
    >
      {/* Glow layer — appears on hover */}
      <div className="card-glow absolute inset-0 rounded-xl bg-gradient-to-t from-electric-blue/[0.04] via-transparent to-transparent pointer-events-none" />

      {/* Subtle gradient overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t ${variantGradients[variant]} pointer-events-none`}
      />

      {/* Badge top-right */}
      {badge && (
        <span
          className={`
            absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border
            ${badgeColorMap[badgeColor]}
          `}
        >
          {badge}
        </span>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Discipline tag */}
        {discipline && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
            {discipline}
          </span>
        )}

        {/* Icon + Title */}
        <div className="flex items-start gap-2 mb-1">
          {icon && (
            <span className="text-lg shrink-0 mt-0.5">{icon}</span>
          )}
          <h3 className={`font-semibold leading-snug text-text-primary ${compact ? "text-sm" : "text-base"}`}>
            {title}
          </h3>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{subtitle}</p>
        )}

        {/* Mastery indicator */}
        {mastery !== undefined && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Domínio
            </span>
            <span className={`text-xs font-bold ${variantAccent[variant]}`}>
              {mastery}%
            </span>
            <div className="flex-1 h-1 rounded-full bg-graphite/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${variantAccent[variant].replace("text-", "bg-")}`}
                style={{ width: `${mastery}%` }}
              />
            </div>
          </div>
        )}

        {/* Hover detail panel — discipline + mastery + actions */}
        <div className="card-details mt-3 space-y-2">
          {discipline && (
            <p className="text-[10px] text-text-muted">{discipline}</p>
          )}
          <div className="flex items-center gap-2">
            {onAction && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-electric-blue/15 text-electric-blue border border-electric-blue/30 hover:bg-electric-blue/25 transition-colors"
              >
                {actionLabel || "Acessar"}
              </span>
            )}
            {onListToggle && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onListToggle();
                }}
                className={`
                  inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors
                  ${inList
                    ? "bg-success-green/15 text-success-green border-success-green/30 hover:bg-success-green/25"
                    : "bg-navy-800 text-text-muted border-graphite/50 hover:text-electric-blue hover:border-electric-blue/30"
                  }
                `}
              >
                {inList ? "✓ Na Lista" : "+ Lista"}
              </span>
            )}
            {onPreview && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-navy-800 text-text-muted border border-graphite/50 hover:text-text-primary hover:border-graphite transition-colors"
              >
                Info
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar at bottom */}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-graphite/30">
          <div
            className="h-full bg-electric-blue transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </button>
  );
}
