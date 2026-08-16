"use client";

import React, { useEffect, useCallback } from "react";

interface ContentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  discipline?: string;
  badge?: string;
  badgeColor?: string;
  mastery?: number;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  onListToggle?: () => void;
  inList?: boolean;
}

export function ContentPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  discipline,
  badge,
  mastery,
  description,
  onAction,
  actionLabel = "Estudar",
  onListToggle,
  inList = false,
}: ContentPreviewModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-overlay-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-navy-900 rounded-2xl border border-graphite/50 overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-32 bg-gradient-to-br from-electric-blue/10 via-navy-900 to-navy-900 relative">
          {badge && (
            <span className="absolute top-4 right-4 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-gold-institution/30 bg-gold-institution/15 text-gold-institution">
              {badge}
            </span>
          )}
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-navy-900/60 border border-graphite/40 flex items-center justify-center text-text-muted hover:text-text-primary hover:border-graphite transition-colors"
            aria-label="Fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {discipline && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {discipline}
            </p>
          )}
          <h2 className="text-xl font-black text-text-primary leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-text-secondary">{subtitle}</p>
          )}

          {mastery !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Domínio
              </span>
              <span className="text-sm font-bold text-electric-blue">{mastery}%</span>
              <div className="flex-1 h-1.5 rounded-full bg-graphite/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-electric-blue transition-all duration-500"
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </div>
          )}

          {description && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {onAction && (
              <button
                type="button"
                onClick={onAction}
                className="px-5 py-2.5 rounded-xl bg-electric-blue text-white font-bold text-sm hover:bg-electric-blue/80 transition-colors shadow-[0_0_16px_rgba(0,180,255,0.2)]"
              >
                {actionLabel}
              </button>
            )}
            {onListToggle && (
              <button
                type="button"
                onClick={onListToggle}
                className={`
                  px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors
                  ${inList
                    ? "bg-success-green/15 text-success-green border-success-green/30 hover:bg-success-green/25"
                    : "bg-navy-800 text-text-secondary border-graphite/50 hover:border-electric-blue/30 hover:text-electric-blue"
                  }
                `}
              >
                {inList ? "✓ Na Lista" : "+ Minha Lista"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto px-4 py-2.5 rounded-xl text-text-muted text-sm font-semibold hover:text-text-primary transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
