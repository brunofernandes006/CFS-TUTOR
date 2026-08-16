# Changelog

## [1.3.0] - 2026-08-16 — STREAMING + HOMOLOGAÇÃO FINAL

### Streaming Design (v1.1 → v1.3)
- HOME redesenhada em estilo Netflix/streaming com Hero, ContentRows, carrosséis
- /estudar: ContentRows por disciplina, filtro, modal preview, Minha Lista
- /biblioteca: DocCoverCards por tipo, busca overlay, preview modal
- /simulados: Hero, cards oficial/adaptativa, disponibilidade, histórico
- /questoes: Hero, quick start por disciplina, questão ativa preservada
- TopNav global com stats pills, busca, menu mobile hamburger
- SearchOverlay com busca global
- ContentPreviewModal com detalhes e ações
- Skeletons (SkeletonHero, SkeletonRow, SkeletonCard) para loading
- Animações CSS-only: fade-in-up, modal-in, overlay-in, micro-pop, stagger delays
- prefers-reduced-motion respeitado em todos componentes
- Skeleton pulse, card-details hover, card-glow, row-fade-left/right
- TopNav scroll-reactive (glass → solid)
- Carousel scroll-snap com botões de navegação
- Hero parallax sutil

### Global Finishing (v1.3)
- AppShell: drawer mobile completo com overlay, slide-in-left animation, body scroll lock
- TopNav: hamburger menu mobile com todos 12 itens de nav
- Modal: ESC key fecha, animações overlay+panel, mobile slide-up, max-h 85vh, aria-modal
- SearchBar: ARIA combobox, click outside, escape, suggestions listbox
- LoadingState: tokens streaming, border-radius consistente
- EmptyState: prop action opcional para botão CTA
- error.tsx: SVG icon inline, digest display, touch targets
- not-found.tsx: SVG icon inline, touch targets, link home
- CSS v1.3: :focus-visible global (outline gold), touch targets 44px, mobile menu, install banner

### Accessibility
- focus-visible com outline gold em todos interactive elements
- Touch targets min 44px em dispositivos touch
- ARIA: role="dialog", aria-modal, aria-current="page", role="combobox", aria-label
- Todos botões ícone com aria-label

### PWA
- manifest.json com campos obrigatórios (scope, theme_color, start_url)
- SVG icons para any e maskable
- appleWebApp metadata
- Theme color #071a2b

### Assets
- 5 assets Next.js default removidos (file/globe/next/vercel/window.svg)
- icon.svg mantido como PWA icon

### Bug Fixes (Homologação)
- desempenho/page.tsx: adicionado try/catch + error state no fetch
- resultado/page.tsx: adicionado try/catch/finally no run() — impede spinner infinito
- simulados/page.tsx: adicionado r.ok check antes de r.json()
- page.tsx (HOME): fallback UI quando data=null (impede página em branco)

### Fixed (desde v1.0.0)
- DisciplineBadge: suporte a nomes completos de disciplina do banco
- Fluxo de estudo: chave de idempotência estável (evita XP duplicado)
- Todas as páginas: tratamento de erro r.ok em chamadas fetch
- Todas as páginas: try/catch em chamadas de rede
- Simulados e Desempenho: migração para design system Tactical
- Biblioteca: botão "Abrir" funcional + "Copiar caminho"
- Dashboard: botões de acesso rápido da biblioteca com links
- Configurações: loading state durante carregamento
- Launchers: browser abre somente após servidor estar pronto

### Security
- Nenhum dado é enviado para servidores externos
- Backup é 100% local
- Tutor IA funciona offline (sem API externa)

---

## [1.0.0] - 2026-08-16

### Added
- Dashboard (Base Operacional) com prontidão CFS, XP, nível, streak
- Missões do dia com 4 tipos: Reciclagem, Conteúdo, Treinamento, Fechamento
- Edital completo com 182 itens, filtros e árvore hierárquica
- Sistema de questões com gabarito, explicação e XP
- Revisão espaçada (1d→3d→7d→15d→30d)
- Simulado oficial (60 questões, 3 disciplinas, pesos, mínimos)
- Simulado adaptativo (quantidade configurável)
- Caderno de erros com contagem e filtro por disciplina
- Página de desempenho com prontidão, domínio por disciplina, evolução
- Biblioteca com 694 documentos, busca, filtros, paginação
- Tutor IA offline com 8 objetivos e geração de prompts
- Backup/exportação em JSON com restauração
- Configurações: nome, meta diária, disciplina foco, aparência
- PWA com manifest.json e ícones
- Launchers para Windows (.bat e .ps1)
- Importador Python de questões (--dry-run, --write, --db)
- Error boundaries (error.tsx, not-found.tsx)
- Testes automatizados (Jest)
