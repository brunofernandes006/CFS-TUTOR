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

const LEVEL_ICONS: Record<string, string> = {
  Recruta: "🪖",
  Patrulheiro: "🔵",
  Especialista: "⭐",
  Veterano: "🥈",
  Elite: "🥇",
  Comando: "🏆",
};

const NAV_ITEMS = [
  { href: "/", label: "Base", icon: "⬡" },
  { href: "/estudar", label: "Estudar", icon: "📖" },
  { href: "/questoes", label: "Questões", icon: "✏️" },
  { href: "/simulados", label: "Simulados", icon: "🏅" },
  { href: "/biblioteca", label: "Biblioteca", icon: "🗂" },
  { href: "/missoes", label: "Missões", icon: "🎯" },
  { href: "/revisao", label: "Revisão", icon: "🔄" },
  { href: "/desempenho", label: "Desempenho", icon: "📊" },
  { href: "/caderno", label: "Caderno", icon: "📝" },
  { href: "/tutor-ia", label: "Tutor IA", icon: "🤖" },
  { href: "/configuracoes", label: "Config", icon: "⚙️" },
];

export function TopNav({ level, xp, streak, onSearch }: TopNavProps) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleScroll = useCallback(() => {
    setSolid(window.scrollY > 40);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 right-0 z-40
          pointer-events-none
          transition-all duration-200 ease-out
          ${solid
            ? "topnav-solid bg-navy-900/95"
            : "bg-gradient-to-b from-navy-900 via-navy-900/80 to-transparent"
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between pointer-events-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-electric-blue/15 border border-electric-blue/30 flex items-center justify-center text-electric-blue font-black text-sm group-hover:bg-electric-blue/25 transition-colors">
              CFS
            </div>
            <span className="hidden sm:block text-sm font-bold text-text-primary tracking-wide">
              TUTOR
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Stats pills */}
            {level && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-900/80 border border-graphite/40 text-xs font-semibold text-text-primary">
                <span>{LEVEL_ICONS[level] ?? "⬡"}</span>
                <span>{level}</span>
              </span>
            )}
            {xp !== undefined && xp > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-institution/10 border border-gold-institution/20 text-xs font-bold text-gold-institution">
                {xp.toLocaleString("pt-BR")} XP
              </span>
            )}
            {streak !== undefined && streak > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-alert-red/10 border border-alert-red/20 text-xs font-bold text-alert-red">
                {streak}🔥
              </span>
            )}

            {/* Search button */}
            <button
              type="button"
              onClick={onSearch}
              className="w-9 h-9 rounded-lg bg-navy-900/80 border border-graphite/40 flex items-center justify-center text-text-muted hover:text-electric-blue hover:border-electric-blue/30 transition-colors"
              aria-label="Buscar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Hamburger menu — mobile */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="w-9 h-9 rounded-lg bg-navy-900/80 border border-graphite/40 flex items-center justify-center text-text-muted hover:text-text-primary hover:border-graphite transition-colors md:hidden"
              aria-label="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Settings link — desktop */}
            <Link
              href="/configuracoes"
              className="hidden md:flex w-9 h-9 rounded-lg bg-navy-900/80 border border-graphite/40 items-center justify-center text-text-muted hover:text-text-primary hover:border-graphite transition-colors"
              aria-label="Configurações"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="mobile-menu-panel" role="dialog" aria-label="Menu de navegação">
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold" style={{ color: "var(--gold)" }}>⬡ CFS Tutor</div>
              <button
                type="button"
                onClick={closeMenu}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--muted)", background: "var(--navy-3)" }}
                aria-label="Fechar menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="py-2 overflow-y-auto flex-1" aria-label="Menu completo">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                    style={{
                      color: active ? "var(--gold)" : "var(--text)",
                      background: active ? "rgba(201,168,76,0.08)" : "transparent",
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="text-lg w-6 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && (
                      <span
                        className="ml-auto w-2 h-2 rounded-full"
                        style={{ background: "var(--gold)" }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
