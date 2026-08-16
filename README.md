# CFS Tutor — Missão Aprovação

Ambiente gamificado de estudo para o **Curso de Formação de Soldados da Polícia Militar do Estado de São Paulo (CFS PMESP)**.

**Versão: 1.3.0 — Streaming + Homologação Final**

## Funcionalidades

- **Home Streaming**: Dashboard estilo Netflix com Hero, ContentRows, carrosséis, Minha Lista
- **Estudar**: Edital completo com 182 itens, filtro por disciplina, progresso, revisão pendente
- **Questões**: Prática com gabarito, explicação e caderno de erros
- **Revisão Espaçada**: Sistema de repetição espaçada (1d→3d→7d→15d→30d)
- **Simulados**: Prova oficial (60 questões, 3h30) e adaptativo
- **Caderno de Erros**: Registro automático de erros por disciplina
- **Desempenho**: Indicadores internos de preparação
- **Biblioteca**: 694 documentos oficiais organizados e pesquisáveis
- **Tutor IA Offline**: Geração de prompts para estudo assistido (8 objetivos, sem API externa)
- **Backup**: Exportação e importação de progresso em JSON
- **Configurações**: Personalização de meta, disciplina foco, aparência
- **PWA**: Instalável como aplicativo no desktop e mobile

## Como Iniciar

### Windows (Recomendado)
1. Clique duas vezes em `INICIAR_CFS_TUTOR.bat`
2. Aguarde o servidor iniciar
3. O navegador abrirá automaticamente em http://localhost:3000

### PowerShell
```powershell
.\INICIAR_CFS_TUTOR.ps1
```

### Manual
```bash
npm install
npm run dev
```

## Estrutura

```
CFS_TUTOR_APP/
├── app/                    # Páginas e rotas (Next.js App Router)
│   ├── api/                # Rotas de API server-side
│   ├── page.tsx            # Home Streaming (Netflix-style)
│   ├── missoes/            # Missões do dia
│   ├── estudar/            # Edital completo (streaming)
│   ├── questoes/           # Prática de questões (streaming)
│   ├── revisao/            # Revisão espaçada
│   ├── simulados/          # Simulados oficial e adaptativo (streaming)
│   ├── desempenho/         # Indicadores de desempenho
│   ├── caderno/            # Caderno de erros
│   ├── biblioteca/         # Documentos oficiais (streaming)
│   ├── tutor-ia/           # Tutor IA offline
│   ├── configuracoes/      # Configurações do aluno
│   └── backup/             # Backup e exportação
├── components/             # Componentes React
│   ├── layout/             # AppShell, navegação, drawer mobile
│   ├── streaming/          # Hero, TopNav, ContentRow, SearchOverlay, Modals
│   └── ui/                 # TacticalCard, TacticalButton, Modal, EmptyState
├── hooks/                  # useHomeData, useMyList, useReducedMotion
├── lib/                    # Lógica de negócio
│   ├── services/           # Services (pedagogy, simulation, etc.)
│   ├── db.ts               # Conexão SQLite (better-sqlite3)
│   └── types.ts            # TypeScript types
├── public/                 # Ícones, manifest.json
├── scripts/                # Importador Python
└── __tests__/              # Testes Jest (197 testes)
```

## Design System Streaming

- **Palette**: Navy (#071a2b), Electric Blue, Gold Institution, Cyan Glow
- **Animações**: CSS-only (fade-in-up, modal-in, skeleton-pulse, carousel-scroll)
- **Acessibilidade**: focus-visible, touch targets 44px, ARIA labels, prefers-reduced-motion
- **Mobile**: Drawer menu, modal slide-up, responsivo 360px–1920px
- **PWA**: Manifest completo, ícones SVG, standalone mode

## Tecnologias

- **Frontend**: Next.js 16.3, React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Next.js API Routes, better-sqlite3
- **Banco**: SQLite (local, arquivo único)
- **Testes**: Jest (197 testes, 8 suites)
- **PWA**: Manifest + icons

## Requisitos

- Node.js 18+
- npm 9+
- Navegador moderno (Chrome, Firefox, Edge)

## Licença

Ferramenta de uso pessoal para estudos. Não é oficial da PMESP.
