import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-electric-blue/10 border border-electric-blue/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--electric-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary">Página não encontrada</h2>
        <p className="text-sm text-text-secondary">
          A rota solicitada não existe no sistema.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-lg bg-electric-blue text-white font-bold hover:bg-cyan-glow transition-colors min-h-[44px] leading-[44px]"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
