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
| CI do repositório verde com contratos | workflow `ci.yml` | VERDE: run `33351165709`, job `99364678673`, commit `ad1794d`; lint/test/contratos/build aprovados |
| harness SQL reproduzível em CI | workflow manual `database-baseline.yml` | VERDE: run `33351184089`, job `99364743713`; fresh e upgrade aprovados |
| ambiente local sem segredo/ligação remota | `supabase/config.toml`, `.env.local` ausente | VERDE |
| smoke mobile V2 registrado | `baselines/phase0-mobile-smoke.md` | VERDE: cinco viewports, fluxos e dívidas registrados |
| política de convite e retenção aprovada | ADR 008 | VERDE: invite-only e ciclo completo formalizados |
| plano de backup/staging | `contracts/backup-staging-plan.md` | VERDE documental |
| projeto de produção identificado em runbook restrito | ref mascarado + assinatura das 20 migrations; leitura somente | VERDE: projeto `ACTIVE_HEALTHY`, sem escrita |
| staging Supabase separado e restore drill | `CFS-TUTOR-STAGING` / `rygcwnxbkftmrifejfbl`; `backup-staging-plan.md` | VERDE: 20 migrations, fixture, 35 pgTAP, integridade e rollback `2→0→2` |

Enquanto houver `VERMELHO` ou `PENDENTE`, a decisão obrigatória é `FASE 1 BLOQUEADA`.

Em 30/08/2026, todos os itens desta matriz estão `VERDE`. A Fase 1 é liberável somente mediante nova autorização explícita; este gate não a inicia.
