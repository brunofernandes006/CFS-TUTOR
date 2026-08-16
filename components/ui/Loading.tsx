export function Loading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3" style={{ color: "var(--muted)" }}>
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: "var(--navy-3)", borderTopColor: "var(--gold)" }}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
