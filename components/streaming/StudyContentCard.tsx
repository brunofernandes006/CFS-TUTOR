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

const badgeColorMap = {
  gold: "bg-gold-institution/15 text-gold-institution border-gold-institution/30",
  blue: "bg-electric-blue/15 text-electric-blue border-electric-blue/30",
  red: "bg-alert-red/15 text-alert-red border-alert-red/30",
  green: "bg-success-green/15 text-success-green border-success-green/30",
};

export function StudyContentCard({
  title, subtitle, discipline, progress, mastery, badge, badgeColor = "gold", icon,
  onClick, onAction, actionLabel, onPreview, onListToggle, inList = false,
  compact = false, animate = false,
}: StudyContentCardProps) {
  const safeMastery = mastery == null ? undefined : Math.max(0, Math.min(100, Math.round(mastery)));
  const safeProgress = progress == null ? undefined : Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <article className={`relative h-full overflow-hidden rounded-2xl border border-graphite/40 bg-navy-900 ${compact ? "p-3" : "p-4"} ${animate ? "animate-fade-in-up" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {discipline && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{discipline}</p>}
          <div className="flex items-start gap-2">
            {icon && <span className="shrink-0 text-lg">{icon}</span>}
            <h3 className="min-w-0 text-sm font-black leading-snug text-text-primary sm:text-base">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">{subtitle}</p>}
        </div>
        {badge && <span className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${badgeColorMap[badgeColor]}`}>{badge}</span>}
      </div>

      {safeMastery !== undefined && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted"><span>Domínio</span><span className="text-text-primary">{safeMastery}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-graphite/30"><div className="h-full rounded-full bg-electric-blue" style={{ width: `${safeMastery}%` }} /></div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {onClick && <button type="button" onClick={onClick} className="rounded-lg bg-electric-blue/15 px-3 py-2 text-[11px] font-black text-electric-blue">Abrir</button>}
        {onAction && <button type="button" onClick={onAction} className="rounded-lg border border-graphite/40 bg-navy-800 px-3 py-2 text-[11px] font-bold text-text-secondary">{actionLabel || "Acessar"}</button>}
        {onListToggle && <button type="button" onClick={onListToggle} className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${inList ? "border-success-green/30 bg-success-green/10 text-success-green" : "border-graphite/40 bg-navy-800 text-text-secondary"}`}>{inList ? "✓ Na Lista" : "+ Lista"}</button>}
        {onPreview && <button type="button" onClick={onPreview} className="rounded-lg border border-graphite/40 bg-navy-800 px-3 py-2 text-[11px] font-bold text-text-secondary">Info</button>}
      </div>

      {safeProgress !== undefined && <div className="absolute inset-x-0 bottom-0 h-1 bg-graphite/20"><div className="h-full bg-electric-blue" style={{ width: `${safeProgress}%` }} /></div>}
    </article>
  );
}
