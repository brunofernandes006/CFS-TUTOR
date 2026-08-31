# CFS Tutor V3 — roadmap de implementação

Cada migration abaixo é apenas prevista. Quando a fase for autorizada, o arquivo deve ser criado pela CLI (`supabase migration new <nome>`) e revisado; nenhum timestamp/nome definitivo é estabelecido por esta especificação.

## Fase 0 — baseline, contratos e gates

**Objetivo:** congelar invariantes, restaurar baseline executável e aprovar os ADRs normativos de identidade, autorização/RPC, sigilo do gabarito, cache, versionamento e consistência pedagógica antes de qualquer migration.

**Arquivos afetados:** `docs/v3/*`, `README.md`, `package.json` (engines/scripts quando autorizado), `.env.example`, novos ADRs em `docs/adr/`, configuração de CI e testes de baseline.

**Tabelas/migrations previstas:** nenhuma alteração de tabela; migration de baseline não é necessária.

**Dependências:** inventário de ambientes e migrations aplicadas; Node.js 22+; dependências/lockfile; backup e staging.

**Risco:** baixo; principal risco é requisito contraditório ou métrica inexistente.

**Testes:** instalar dependências pelo lockfile; lint/test/build atuais verdes; criar harness Supabase local que aplica banco novo e upgrade de fixture V2; smoke mobile; snapshot de contagens; teste estático de imports privilegiados e rotas; verificação do corpus.

**Rollback:** remover somente flags/telemetria preparatória não usada; documentação permanece como histórico.

**Critério de aceite:** ADRs 001–006 aprovados; suíte V2 verde; harness SQL/CI executável; mapa `rota/método → auth_mode` e matrizes grants/RLS aprovados; inventário/checksums de migrations (inclusive a reconciliação local `014` → `015`) registrado; zero alteração funcional/banco.

**Registro da execução:** a autorização de 30/08/2026 está registrada em [phase-0-baseline.md](./phase-0-baseline.md). O gate objetivo está em [contracts/phase-1-entry-gate.md](./contracts/phase-1-entry-gate.md) e inclui o ADR 007. Este registro não autoriza a Fase 1.

## Fase 1 — fundação de Supabase Auth e perfis

**Objetivo:** introduzir Supabase Auth por convite/aprovação e sessão SSR em piloto `/v3`, criar a ponte de identidade sem reescrever FKs e manter autoridade única por rota.

**Arquivos afetados:** `package.json`, lockfile, `proxy.ts`, `app/layout.tsx`, `app/v3/**`, `app/(auth)/**`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/auth/**`, mapa server-only de auth mode, `components/auth/**`, `.env.example`; rotas V2 permanecem separadas.

**Tabelas/migrations previstas:** `app_users.auth_user_id` nulo/unique; `private.legacy_user_auth_map`; `profiles`, `user_preferences`, `private.user_roles`; grants/RLS; operação administrativa idempotente de criação do proprietário/perfil/mapa; migration expand “auth_identity_bridge”.

**Dependências:** Fase 0; configuração Auth/SMTP/redirect URLs; versão fixada do cliente SSR; ambiente HTTPS de preview.

**Risco:** alto; sessão, refresh, cache indevido, enumeração de usuário e lockout do proprietário.

**Testes:** convite/ativação, confirmação, login/logout/reset, sessão expirada, cookies SSR, redirect/rate limit; criação do proprietário reexecutada; cookie legado + Auth em todas as combinações; rota `AUTH_V3` nunca resolve legado; rota `LEGACY_OWNER` nunca resolve Auth; cache com `Set-Cookie`; anon/A/B/admin.

**Rollback:** desligar `/v3` e manter rotas V2 `LEGACY_OWNER`; não apagar Auth/perfil/mapa; não abrir modo híbrido. Reexecução do expand é idempotente.

**Critério de aceite:** mapa legado está `VERIFIED`; dois usuários Auth isolados; `/v3` aceita somente Auth; V2 aceita somente legado; cookie Auth/logout expira `cfs_access`; nenhuma URL final possui páginas concorrentes; recuperação é neutra e aluno não acessa admin.

## Fase 2 — identidade nos dados e RLS por usuário

**Objetivo:** introduzir acesso user-scoped, backfill idempotente/ponte e novos RPCs seguros; provar isolamento antes de retirar qualquer estrutura V2.

**Arquivos afetados:** `lib/config/user.ts`, divisão de `lib/server/supabaseRest.ts` em clientes user/admin, serviços em `lib/server/**`, APIs V3 de home/attempts/reviews/performance/errors/simulations, regra de lint/architecture e `supabase/tests/**`.

**Tabelas/migrations previstas:** manter FKs V2; `auth_user_id` sombra nas tabelas privadas usadas pela V3; linha `app_users` compatível para novos Auth; batches/checksums; policies pela coluna Auth (helper privado só para relação read-only ainda não expandida); grants mínimos; novos RPCs V3 sem `p_user_id`, com wrapper invoker exposto e função definer privada quando necessária, `search_path = ''`; RPCs V2 continuam service-role-only; migration expand “multiuser_rls_and_safe_rpcs”.

**Dependências:** Fase 1; backup; usuário Auth proprietário; inventário completo de FKs/RPCs.

**Risco:** crítico; vazamento entre usuários, perda de dados ou funções `security definer` permissivas.

**Testes:** backfill/reexecução; contagens/checksums; grants + allow/deny CRUD; anon/A/A→B/B/admin autenticado/backend admin/service-role; BOLA/IDOR REST e RPC; sessão nula/expirada; UPDATE de owner; catálogo contra PUBLIC EXECUTE/definer exposto/search_path aberto; advisors; import privilegiado proibido.

**Rollback:** desligar APIs `/v3`; retornar rotas previstas a `LEGACY_OWNER`; mapa/FKs/colunas V2 permanecem; preservar dados V3 para reconciliação. Nunca conceder RPC legado ao cliente nem abrir policies.

**Critério de aceite:** todo dado privado é alcançável pelo Auth correto via owner direto/ponte; nenhuma operação comum usa service role, `DEFAULT_USER_ID` ou recebe `p_user_id`; RPCs/grants seguros; contagens V2/V3 coincidem e sete dias de dual-read sem divergência foram iniciados.

## Fase 3 — shell V3, navegação e persistência

**Objetivo:** entregar shell mobile-first no prefixo piloto, Server Components iniciais e restauração segura no agregado dono, sem colisão de route groups.

**Arquivos afetados:** `app/(student)/layout.tsx`, `app/(admin)/layout.tsx`, `components/layout/**`, `components/navigation/**`, `components/feedback/**`, `lib/state/**`, páginas Hoje/Estudar/Questões/Desempenho, `public/sw.js`, testes UI/E2E.

**Tabelas/migrations previstas:** evolução de `user_preferences`, `study_sessions` e `simulations`; **não criar `ui_checkpoints` genérica**; migration “owned_session_state” somente se as colunas forem necessárias.

**Dependências:** Fase 2; design tokens e wireflows; política de storage local.

**Risco:** médio; regressão de navegação, hidratação, foco, cache por usuário e perda de estado.

**Testes:** 360/390/412/768/1280, teclado/safe area/zoom/reader, reload/history, duas abas, A→logout→B inspecionando memória/local/session/IndexedDB/Cache Storage, refresh com `Set-Cookie`, rede lenta e allowlist do offline shell.

**Rollback:** flag para shell V2; ignorar checkpoints V3; service worker versionado remove cache novo.

**Critério de aceite:** `/v3` não colide com páginas V2; URL restaura filtros; estado remoto pertence à sessão/simulado; storage contém somente allowlist e namespace Auth; SW não cacheia conteúdo autenticado; navegação acessível.

## Fase 4 — conteúdo real e módulo Estudar

**Objetivo:** publicar conteúdo próprio e rastreável por item do edital, com recuperação ativa e progresso individual.

**Arquivos afetados:** `app/(student)/estudar/**`, `app/(admin)/admin/conteudos/**`, `components/study/**`, `components/admin/content/**`, `lib/domain/content/**`, `lib/services/study/**`, actions/handlers de conteúdo e progresso.

**Tabelas/migrations previstas:** `syllabus_versions`, `syllabus_version_items`, `study_contents`, `study_content_blocks`, `content_source_links`, `active_recall_prompts`, `content_audit_log`; `syllabus_items` permanece conceito estável; evolução de sessões/progresso; migration expand/backfill “study_content_and_curriculum_versions”.

**Dependências:** Fase 3; modelo editorial; fontes validadas; sanitização/schema de blocos; papéis admin/revisor.

**Risco:** alto; conteúdo sem fonte, vigência incorreta, XSS em blocos ou domínio inferido de leitura.

**Testes:** backfill de edição V2 idempotente; publicação bloqueada sem fonte; versão fixada em sessão; novo edital não clona/apaga progresso; projeção pública não expõe fonte bruta; preview/mobile/recall; RLS; XSS; retomada e domínio com evidência.

**Rollback:** desabilitar rotas/flag do Estudar V3; despublicar unidades sem excluir; manter árvore V2 e dados coletados para reconciliação.

**Critério de aceite:** edição V2 conciliada sem órfãos; item piloto possui conteúdo/fonte/recall/progresso; sessão mantém sua versão; aluno vê somente citação/asset autorizado; auditoria registra publicação.

## Fase 5 — sessões e motor de questões V3

**Objetivo:** materializar sessões, filtros avançados, questões relacionadas, prefetch limitado e resposta idempotente.

**Arquivos afetados:** `app/(student)/questoes/**`, `components/questions/**`, `lib/domain/questions/**`, `lib/services/question-query/**`, `lib/services/session/**`, actions/handlers de sessão/attempt, testes do motor.

**Tabelas/migrations previstas:** `study_session_items`, `saved_filters`, relações, `question_versions` sem resposta, `private.question_answer_versions`, view API segura, `question_reports`, outbox; colunas V3 nulas/idempotência/policy version em attempts; versão-baseline e dual-write; migration expand “question_boundary_sessions_and_attempts”.

**Dependências:** Fase 4; `PublicQuestionDTO`/`QuestionFeedbackDTO`; ADRs 003/005/006; `ReviewPolicyV3` com paridade; pool válido.

**Risco:** alto; seleção fora do edital, duplicação de attempts, exposição antecipada do gabarito e query lenta.

**Testes:** leitura direta de gabarito por REST/GraphQL/view/RPC negada; payload/log/prefetch sem campo secreto; submissão pós-correção; anulada; matriz/property de filtros; retry igual/conflitante; paridade 24h/7d/30d/60d; caderno de erros idempotente; versão-baseline; seleção no banco, cursor, N+1 e EXPLAIN.

**Rollback:** desligar criação `/v3`, preservar attempts/outbox confirmados e reconciliar; V2 continua apenas na rota `LEGACY_OWNER`; tabelas privadas de resposta permanecem fechadas.

**Critério de aceite:** sessão sobrevive a reload; cliente só recebe DTO seguro; feedback só após submit; retry não duplica attempt/progresso/erro/outbox; política canônica aplicada; queries paginadas/batch dentro do orçamento; filtros privados.

## Fase 6 — revisões, erros, favoritos e cadernos

**Objetivo:** unificar recuperação por revisão/erro e entregar coleções privadas com optimistic UI seguro.

**Arquivos afetados:** `app/(student)/revisao/**`, `app/(student)/erros/**`, `app/(student)/favoritos/**`, `app/(student)/cadernos/**`, `components/collections/**`, `components/review/**`, serviços/actions correspondentes.

**Tabelas/migrations previstas:** `favorites`, `notebooks`, `notebook_items`; evolução de `review_schedule` e `error_notebook`; possível `error_classification_events`; migration “reviews_errors_collections”.

**Dependências:** Fase 5; `ReviewPolicyV3` já ativa/testada; tabelas tipadas de favoritos/cadernos decididas.

**Risco:** médio; conflito multiaba, itens órfãos e optimistic UI divergente.

**Testes:** RLS A/B; paginação/cursor e join batch sem catálogo inteiro; optimistic rollback; concorrência; agenda 24h/7d/30d/60d igual ao motor; causa editável/auditável; erro idempotente/resolvido/reaberto; anulada não cria erro.

**Rollback:** desligar coleções/recuperação V3; preservar tabelas; retornar telas V2 de revisão/erros; revalidar agregados.

**Critério de aceite:** favorito/caderno sincroniza e reverte falha; revisão e erro iniciam sessão correta; nenhum usuário acessa coleção alheia.

## Fase 7 — provas anteriores e simulados resilientes

**Objetivo:** oferecer provas históricas auditadas e modernizar simulado oficial/adaptativo com checkpoint, cartão mobile e conclusão idempotente.

**Arquivos afetados:** `app/(student)/provas-anteriores/**`, `app/(student)/simulados/**`, `components/exams/**`, `components/simulations/**`, serviços/RPCs de exams/simulations e admin de provas.

**Tabelas/migrations previstas:** evolução de `exams`, `simulations` com `syllabus_version_id`, `simulation_questions` com `question_version_id`, version/idempotency e `attempt_id` único; sem owner duplicado; migration expand “versioned_resilient_simulations”.

**Dependências:** Fase 5; pares prova/gabarito validados; regras oficiais vigentes; UX de cartão/timer.

**Risco:** crítico; nota errada, resposta perdida, pool inválido ou mistura de edital histórico/corrente.

**Testes:** distribuição/pesos/mínimos; pool/escopo/versão; nenhum gabarito durante `IN_PROGRESS`; resposta congelada; reload/retry/duas abas; finalização repetida gera mesmo resultado e exatamente um attempt por item; histórico não muda após editar questão; revisão/erro sem dupla contagem.

**Rollback:** bloquear novas aplicações V3; permitir concluir sessões existentes pelo caminho compatível; manter dados/seed; reativar simulado V2 para novas criações.

**Critério de aceite:** simulado de 60 questões fixa edital/versões, retoma, não vaza gabarito, finaliza uma vez, calcula nota e integra attempts/revisão/erros exatamente uma vez; prova histórica preserva fonte e fatos.

## Fase 8 — metas, XP e gamificação

**Objetivo:** aumentar consistência com metas e recompensas pedagógicas, sem transformar volume em domínio.

**Arquivos afetados:** `app/(student)/metas/**`, `app/(student)/conquistas/**`, cards da Home/Perfil, `components/gamification/**`, `lib/domain/goals/**`, `lib/services/xp/**`, jobs/agregadores.

**Tabelas/migrations previstas:** `goals`, `goal_progress`, `xp_events`, `user_xp`, `achievements`, `user_achievements`, `study_streaks`; migration “goals_xp_achievements”.

**Dependências:** fases 4–7; catálogo de regras versionado; eventos idempotentes; timezone do usuário.

**Risco:** médio/alto; farming de XP, duplicação, streak punitiva e inconsistência por timezone.

**Testes:** ledger/idempotência; replay/rebuild do saldo; timezone/DST; limites diários; anulação de evento; meta parcial/concluída; nenhuma recompensa por attempt inválida.

**Rollback:** ocultar UI e parar emissão de novos eventos; ledger permanece; recalcular saldo ao corrigir regra, sem apagar histórico.

**Critério de aceite:** XP é derivável do ledger, não duplica em retry e não altera domínio; metas refletem eventos elegíveis; sequência tem tolerância documentada.

## Fase 9 — desempenho individual e escala

**Objetivo:** entregar análise por período/disciplina/item e materializar apenas agregados necessários; paginação/N+1 das rotas tocadas já foram corrigidos nas fases anteriores.

**Arquivos afetados:** `app/(student)/desempenho/**`, `components/performance/**`, `lib/services/performance/**`, jobs, cache tags, instrumentação e dashboards técnicos.

**Tabelas/migrations previstas:** `performance_daily`, índices de cobertura, views `security_invoker` ou funções invoker; migration “performance_aggregates_and_indexes”.

**Dependências:** dados estáveis das fases 4–8; critérios de evidência; plano de retenção e observabilidade.

**Risco:** alto; agregado incorreto, cache entre usuários, métricas sem amostra e regressão de query.

**Testes:** reconciliação agregado/eventos; cache puro global e privado no-request; A→logout→B; 7/30/90/todo sem limite 5.000; dados insuficientes; cursor; explain/analyze/carga; Web Vitals e ausência de PII/conteúdo/gabarito.

**Rollback:** desativar agregados e voltar a consultas canônicas limitadas; invalidar tags/cache; reconstruir `performance_daily`.

**Critério de aceite:** métricas batem com eventos, mostram amostra e filtros; p75 atende orçamento; nenhum cache mistura usuários.

## Fase 10 — painel administrativo completo e contract do legado

**Objetivo:** concluir governança do corpus, auditoria, reportes e remover acesso single-user somente após estabilidade.

**Arquivos afetados:** `app/(admin)/admin/**`, `components/admin/**`, serviços de fontes/conteúdo/questões/reportes/usuários, `proxy.ts`, remoção de `lib/config/user.ts` e `app/api/auth` legado, docs operacionais.

**Tabelas/migrations previstas:** completar `content_audit_log`, filas/status e índices; remover `access_key_hash` e compatibilidade `app_users` quando seguro; revogar funções/grants legados; migration “admin_governance_and_legacy_contract”.

**Dependências:** todas as fases anteriores; cutover Auth concluído; duas releases e no mínimo 14 dias estáveis; zero uso runtime legado; backup/restore drill e aprovação explícita.

**Risco:** crítico; publicação indevida, privilégio excessivo ou rollback difícil após remoção do legado.

**Testes:** matriz admin/revisor/aluno; auditoria completa; publish/unpublish; reporte; upload seguro; RLS/advisors; restore drill; busca por referências ao cookie/ID legado.

**Rollback:** antes do contract, release anterior controlada somente para proprietário mapeado; nunca modo híbrido. Após remoção, somente migration forward corretiva ou restore ensaiado.

**Critério de aceite:** admin opera corpus com auditoria; aluno não acessa admin/gabarito; zero referência runtime a `DEFAULT_USER_ID`, cookie, `access_key_hash`, helper service-role comum ou RPC V2; `access_key_hash` removido; `app_users` removida apenas com zero FK (ou read-only com contract final registrado); mapa preservado; relatório aprovado.

## Release gate V3

1. Lint, testes unitários, integração, E2E, SQL e build verdes.
2. RLS allow/deny e grants revisados para toda tabela exposta.
3. Advisors sem achado externo aplicável de segurança/performance.
4. Migração ensaiada com contagens, backup e rollback.
5. Corpus sem questão real inválida e conteúdo oficial sem fonte.
6. Mobile/acessibilidade nos breakpoints definidos.
7. Web Vitals e queries dentro dos orçamentos.
8. Nenhuma credencial, endpoint, código, asset, texto ou conteúdo da referência clean-room incorporado.
9. Nenhum BLOQUEADOR/ALTO da revisão arquitetural está pendente; tabela de rastreio e segunda revisão independente publicadas.
