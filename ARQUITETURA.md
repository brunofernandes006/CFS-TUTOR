# Arquitetura — CFS Tutor v1.0.0

## Visão Geral

CFS Tutor é uma aplicação Next.js 16 (App Router) com backend server-side usando better-sqlite3 e frontend React 19 com Tailwind CSS 4.

## Camadas

### Frontend (Client Components)
- **Páginas**: `app/*/page.tsx` — "use client", fetch via API routes
- **Componentes**: `components/ui/` — TacticalCard, TacticalButton, SectionHeader, etc.
- **Layout**: `components/layout/AppShell.tsx` — navegação lateral + header
- **Estado**: React hooks (useState, useEffect, useCallback)
- **Estilo**: Tailwind CSS 4 com tokens customizados (navy, electric-blue, gold-institution, etc.)

### Backend (Server-Side)
- **API Routes**: `app/api/*/route.ts` — Next.js Route Handlers
- **Services**: `lib/services/` — lógica de negócio (pedagogy, simulation, xp, etc.)
- **Database**: `lib/db.ts` — singleton better-sqlite3, synchronous queries
- **Schema**: `lib/schemas/` — definições de tabelas

### Banco de Dados (SQLite)
- **Arquivo**: `../CFS_BIBLIOTECA_SISTEMA/05_DADOS_DO_SISTEMA/cfs_catalogo.db`
- **Tabelas principais**: syllabus_items (182), questions (1+), documents (694), users (8)
- **Tabelas de progresso**: syllabus_progress, question_attempts, error_notebook, reviews
- **Tabelas de simulado**: simulations, simulation_questions, simulation_answers
- **XP**: user_xp, xp_events (com idempotência)

### Fluxo Pedagógico
```
Base Operacional → Missão → Conteúdo → Questão → Resultado
    → Atualização de progresso → Revisão → Caderno de Erros → Desempenho
```

### Simulados
- **OFICIAL**: 60 questões (20/port + 20/mat + 20/prof), 3h30, pesos 3/2/5, mínimos
- **ADAPTATIVO**: Quantidade configurável, prioriza pontos fracos

### Tutor IA Offline
- Gera prompts estruturados para uso com qualquer ferramenta de IA
- 8 objetivos: explicar tema, resumir, plano de revisão, flashcards, etc.
- Consulta banco local para documentos e tópicos relacionados
- NUNCA gera questões como OFICIAL — sempre INEDITA ou DIDATICA

### Importador (Python)
- `scripts/import_questions.py` — importa JSON/CSV para o banco
- Modos: `--dry-run` (validação), `--write` (gravação real)
- Validação: disciplina, origem, syllabus_uid, gabarito, OFICIAL rules

### Backup
- Exportação: JSON com todas as tabelas de progresso + configurações
- Importação: restauração transacional com backup automático prévio
- Biblioteca de documentos NÃO é afetada por backup/restore

### Segurança
- Nenhum dado sai da máquina (offline-first)
- Tutor IA funciona sem API externa
- Backup é 100% local
- Nenhuma questão é classificada como OFICIAL sem verificação
