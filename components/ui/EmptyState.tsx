interface EmptyStateProps {
  message?: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  message = "Nenhum item encontrado.",
  icon = "📭",
  action,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-3 text-center"
      style={{ color: "var(--muted)" }}
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-navy-2 border border-graphite">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-sm max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg bg-electric-blue text-white text-sm font-bold hover:bg-cyan-glow transition-colors min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
