import React from "react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Carregando...",
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        rounded-lg border border-graphite bg-navy-2 px-8 py-12
        ${className}
      `}
    >
      <div className="flex h-8 w-8 animate-spin rounded-full border-2 border-electric-blue border-t-transparent" />
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
