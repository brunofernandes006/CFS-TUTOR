# Gate objetivo de entrada da Fase 1

A decisão é binária. Fase 1 só é liberável quando todos os itens estiverem `VERDE` e houver autorização nova e explícita do usuário.

| Gate | Evidência | Estado em 30/08/2026 |
|---|---|---|
| ADRs 001–008 aceitos | cabeçalhos em `docs/adr/`; ADR 008 formaliza ciclo de conta | VERDE |
| invariantes e mapa auth versionados | contratos e testes Phase 0 | VERDE |
| checksums das 20 migrations registrados | manifesto SHA-256; `014`/`015` reconciliados sem alterar SQL | VERDE |
| lint/test/build anterior e posterior verdes | `phase-0-baseline.md` | VERDE |
| harness fresh aplica migrations reais | `npm run test:db:fresh` | VERDE: 20 migrations e 24/24 pgTAP |
| harness upgrade preserva fixture V2 | `npm run test:db:upgrade` | VERDE: 11/11 pgTAP e histórico preservado |
| pgTAP de schema/grants/RLS verde | `supabase/tests/database/**` | VERDE: 35/35 testes nos dois caminhos |
| CI do repositório verde com contratos | workflow `ci.yml` | PENDENTE: primeiro run remoto detectou hash CRLF/LF; correção canônica validada localmente e aguarda novo run da `main` |
| harness SQL reproduzível em CI | workflow manual `database-baseline.yml` | VERDE localmente; workflow usa os mesmos comandos aprovados |
| ambiente local sem segredo/ligação remota | `supabase/config.toml`, `.env.local` ausente | VERDE |
| smoke mobile V2 registrado | `baselines/phase0-mobile-smoke.md` | VERDE: cinco viewports, fluxos e dívidas registrados |
| política de convite e retenção aprovada | ADR 008 | VERDE: invite-only e ciclo completo formalizados |
| plano de backup/staging | `contracts/backup-staging-plan.md` | VERDE documental |
| projeto de produção identificado em runbook restrito | conferência operacional sem publicar ref | PENDENTE: credencial/project ref indisponíveis nesta sessão |
| staging Supabase separado e restore drill | evidência operacional antes de migration funcional | PENDENTE: ambiente não comprovado |

Enquanto houver `VERMELHO` ou `PENDENTE`, a decisão obrigatória é `FASE 1 BLOQUEADA`.
