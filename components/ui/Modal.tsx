"use client";

import React, { useEffect, useCallback, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  }>;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleEsc]);

  if (!open) return null;

  const variantStyles = {
    primary: "bg-electric-blue text-navy-950 font-bold hover:bg-cyan-glow",
    secondary: "bg-navy-800 text-electric-blue border border-graphite hover:bg-navy-700",
    danger: "bg-alert-red text-white font-bold hover:bg-red-600",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-overlay-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={`
          w-full sm:max-w-md rounded-t-2xl sm:rounded-lg border border-graphite bg-navy-900 shadow-xl
          animate-modal-in max-h-[85vh] flex flex-col
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-graphite bg-navy-800 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase tracking-widest text-gold-institution">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-electric-blue hover:text-cyan-glow transition-colors"
              aria-label="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <div className="border-t border-graphite bg-navy-800 px-6 py-4 shrink-0">
            <div className="flex gap-3">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`
                    flex-1 rounded-sm px-4 py-2.5 text-sm min-h-[44px]
                    transition-all duration-200 ease-out
                    ${variantStyles[action.variant || "primary"]}
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
