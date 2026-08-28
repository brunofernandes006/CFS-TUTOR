"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopNavProps {
  level?: string;
  xp?: number;
  streak?: number;
  onSearch?: () => void;
}

const PRIMARY = [
  { href: "/", label: "Hoje", icon: "⌂" },
  { href: "/estudar", label: "Estudar", icon: "📖" },
  { href: "/questoes", label: "Questões", icon: "✏️" },
  { href: "/desempenho", label: "Desempenho", icon: "📊" },
];

const MORE = [
  { href: "/missoes", label: "Missões", icon: "🎯" },
  { href: "/revisao", label: "Revisão", icon: "🔄" },
  { href: "/simulados", label: "Simulados", icon: "🏅" },
  { href: "/caderno", label: "Caderno de Erros", icon: "📝" },
  { href: "/fontes", label: "Fontes e Upload", icon: "⬆️" },
  { href: "/biblioteca", label: "Biblioteca", icon: "🗂" },
  { href: "/tutor-ia", label: "Tutor IA", icon: "🤖" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
  { href: "/backup", label: "Backup", icon: "💾" },
];

export function TopNav({ level, xp, streak, onSearch }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-graphite/30 bg-navy-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="CFS Tutor - Hoje">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-institution/30 bg-gold-institution/10 text-xs font-black text-gold-institution">CFS</span>
            <span className="hidden text-sm font-black tracking-wide text-text-primary sm:block">TUTOR</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {PRIMARY.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-electric-blue/10 text-electric-blue" : "text-text-secondary hover:bg-navy-800 hover:text-text-primary"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {level && <span className="hidden rounded-full border border-graphite/40 px-3 py-1 text-xs font-semibold text-text-secondary lg:inline">{level}</span>}
            {xp !== undefined && xp > 0 && <span className="hidden text-xs font-bold text-gold-institution lg:inline">{xp.toLocaleString("pt-BR")} XP</span>}
            {streak !== undefined && streak > 0 && <span className="hidden text-xs font-bold text-alert-red sm:inline">{streak}🔥</span>}
            {onSearch && (
              <button type="button" onClick={onSearch} className="flex h-10 w-10 items-center justify-center rounded-xl border border-graphite/40 bg-navy-900 text-text-secondary" aria-label="Buscar">⌕</button>
            )}
            <button type="button" onClick={() => setMenuOpen(true)} className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-graphite/40 bg-navy-900 px-3 text-text-secondary" aria-label="Mais opções">☰</button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-graphite/30 bg-navy-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Navegação principal mobile">
        {PRIMARY.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${active ? "text-electric-blue" : "text-text-muted"}`}>
              <span className="text-base leading-none">{item.icon}</span><span>{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMenuOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-text-muted"><span className="text-base">☰</span><span>Mais</span></button>
      </nav>

      {menuOpen && (
        <>
          <button className="fixed inset-0 z-50 bg-black/60" onClick={closeMenu} aria-label="Fechar menu" />
          <aside className="fixed bottom-0 right-0 top-0 z-[51] w-[86vw] max-w-sm overflow-y-auto border-l border-graphite/40 bg-navy-950 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-graphite/30 pb-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-gold-institution">CFS Tutor</p><p className="text-sm font-semibold text-text-secondary">Navegação</p></div>
              <button onClick={closeMenu} className="h-10 w-10 rounded-xl bg-navy-800 text-text-secondary" aria-label="Fechar">✕</button>
            </div>
            <div className="space-y-1">
              {[...PRIMARY, ...MORE].map((item) => {
                const active = pathname === item.href;
                return <Link key={item.href} href={item.href} onClick={closeMenu} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-electric-blue/10 text-electric-blue" : "text-text-secondary hover:bg-navy-900 hover:text-text-primary"}`}><span className="w-6 text-center">{item.icon}</span><span>{item.label}</span></Link>;
              })}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
