import React from "react";

type AlertType = "error" | "warning" | "info" | "success";

interface AlertPanelProps {
  type: AlertType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  closeable?: boolean;
  onClose?: () => void;
  className?: string;
}

const typeConfig = {
  error: {
    bg: "bg-alert-red/10",
    border: "border-alert-red/50",
    color: "text-alert-red",
    icon: "⚠️",
  },
  warning: {
    bg: "bg-warning-gold/10",
    border: "border-warning-gold/50",
    color: "text-warning-gold",
    icon: "⚡",
  },
  info: {
    bg: "bg-electric-blue/10",
    border: "border-electric-blue/50",
    color: "text-electric-blue",
    icon: "ℹ️",
  },
  success: {
    bg: "bg-success-green/10",
    border: "border-success-green/50",
    color: "text-success-green",
    icon: "✓",
  },
};

export function AlertPanel({
  type,
  title,
  message,
  action,
  closeable = true,
  onClose,
  className = "",
}: AlertPanelProps) {
  const config = typeConfig[type];

  return (
    <div
      className={`
        rounded-sm border px-4 py-4
        ${config.bg} ${config.border}
        ${className}
      `}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 text-2xl">{config.icon}</div>
        <div className="flex-1">
          <h3 className={`font-bold uppercase ${config.color}`}>{title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 font-semibold hover:underline ${config.color}`}
            >
              {action.label}
            </button>
          )}
        </div>
        {closeable && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-2xl hover:opacity-70"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
