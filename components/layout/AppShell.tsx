"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useCallback, useEffect } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  mobileShow?: boolean;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { href: "/",            label: "Base",           icon: "⬡",  mobileShow: true },
  { href: "/missoes",     label: "Missões",         icon: "🎯",  mobileShow: true },
  { href: "/estudar",     label: "Estudar",         icon: "📖" },
  { href: "/questoes",    label: "Questões",        icon: "✏️",  mobileShow: true },
  { href: "/revisao",     label: "Revisão",         icon: "🔄" },
  { href: "/simulados",   label: "Simulados",       icon: "🏅" },
  { href: "/desempenho",  label: "Desempenho",      icon: "📊",  mobileShow: true },
  { href: "/caderno",     label: "Caderno de Erros",icon: "📝" },
  { href: "/biblioteca",  label: "Biblioteca",      icon: "🗂" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
  { href: "/backup",      label: "Backup",          icon: "💾" },
  { href: "/tutor-ia",    label: "Tutor IA",        icon: "🤖" },
];

const STREAMING_ROUTES = ["/", "/estudar", "/biblioteca", "/simulados", "/questoes"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isStreaming = STREAMING_ROUTES.includes(pathname);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  if (isStreaming) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — visível em md+ */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r"
        style={{
          background: "var(--navy-2)",
          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--gold)" }}>
            ⬡ CFS Tutor
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            Missão Aprovação
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto" aria-label="Menu principal">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.soon ? "#" : item.href}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative"
                style={{
                  color: active ? "var(--gold)" : item.soon ? "var(--muted)" : "var(--text)",
                  background: active ? "rgba(201,168,76,0.08)" : "transparent",
                  pointerEvents: item.soon ? "none" : "auto",
                  cursor: item.soon ? "default" : "pointer",
                }}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.soon && (
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--navy-3)", color: "var(--muted)", fontSize: "10px" }}
                  >
                    EM BREVE
                  </span>
                )}
                {active && (
                  <span
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                    style={{ background: "var(--gold)" }}
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Disclaimer */}
        <div className="px-4 py-3 border-t text-xs leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          Ferramenta independente de estudos. Não oficial e sem vínculo com a Polícia Militar do Estado de São Paulo.
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ background: "var(--navy-2)", borderColor: "var(--border)" }}
        >
          <Link href="/" className="font-bold" style={{ color: "var(--gold)" }}>⬡ CFS Tutor</Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: "var(--text)", background: "var(--navy-3)" }}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>

        {/* Bottom nav — mobile */}
        <nav
          className="md:hidden flex border-t"
          style={{ background: "var(--navy-2)", borderColor: "var(--border)" }}
          aria-label="Navegação mobile"
        >
          {NAV.filter((n) => n.mobileShow).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors"
                style={{ color: active ? "var(--gold)" : "var(--muted)" }}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span style={{ fontSize: "10px" }}>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs"
            style={{ color: "var(--muted)" }}
            aria-label="Mais opções"
          >
            <span className="text-lg leading-none">☰</span>
            <span style={{ fontSize: "10px" }}>Mais</span>
          </button>
        </nav>
      </div>

      {/* Drawer mobile — overlay */}
      {drawerOpen && (
        <>
          <div
            className="mobile-menu-overlay md:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div className="mobile-menu-panel md:hidden" role="dialog" aria-label="Menu de navegação">
            <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold" style={{ color: "var(--gold)" }}>⬡ CFS Tutor</div>
              <button
                type="button"
                onClick={closeDrawer}
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
            <nav className="py-2" aria-label="Menu completo">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.soon ? "#" : item.href}
                    onClick={closeDrawer}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                    style={{
                      color: active ? "var(--gold)" : item.soon ? "var(--muted)" : "var(--text)",
                      background: active ? "rgba(201,168,76,0.08)" : "transparent",
                      pointerEvents: item.soon ? "none" : "auto",
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="text-lg w-6 text-center">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.soon && (
                      <span
                        className="ml-auto text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "var(--navy-3)", color: "var(--muted)", fontSize: "10px" }}
                      >
                        EM BREVE
                      </span>
                    )}
                    {active && (
                      <span
                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                        style={{ background: "var(--gold)" }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 py-3 border-t text-xs leading-relaxed" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              Ferramenta independente de estudos. Não oficial.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
