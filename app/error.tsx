"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-alert-red/10 border border-alert-red/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary">Algo deu errado</h2>
        <p className="text-sm text-text-secondary">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted font-mono">{error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-6 py-3 rounded-lg bg-electric-blue text-white font-bold hover:bg-cyan-glow transition-colors min-h-[44px]"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
