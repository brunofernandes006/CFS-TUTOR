# CFS Tutor V3 — roadmap de implementação

Cada migration abaixo é apenas prevista. Quando a fase for autorizada, o arquivo deve ser criado pela CLI (`supabase migration new <nome>`) e revisado; nenhum timestamp/nome definitivo é estabelecido por esta especificação.

## Fase 0 — baseline, contratos e gates

**Objetivo:** congelar invariantes, medir V2, definir contratos de domínio/UX e preparar feature flags sem mudar comportamento.

**Arquivos afetados:** `docs/v3/*`, `README.md`, `package.json` (engines/scripts quando autorizado), `.env.example`, novos ADRs em `docs/adr/`, configuração de CI e testes de baseline.

**Tabelas/migrations previstas:** nenhuma alteração de tabela; migration de baseline não é necessária.

**Dependências:** aprovação da especificação; inventário de ambientes; Node.js 22+; backup e staging.

**Risco:** baixo; principal risco é requisito contraditório ou métrica inexistente.

**Testes:** lint/test/build atuais; smoke mobile; snapshot de contagens; verificação do corpus e regras invariáveis.

**Rollback:** remover somente flags/telemetria preparatória não usada; documentação permanece como histórico.

**Critério de aceite:** ADRs de Auth, RLS, cache, idempotência e conteúdo aprovados; baseline registrado; zero alteração funcional/banco.

## Fase 1 — fundação de Supabase Auth e perfis

**Objetivo:** introduzir cadastro/login/senha multiusuário via Supabase Auth e sessão SSR, mantendo acesso legado sob flag.

**Arquivos afetados:** `package.json`, lockfile, `proxy.ts`, `app/layout.tsx`, `app/(auth)/**`, `app/(student)/**`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/auth/**`, `components/auth/**`, `.env.example`; substituir gradualmente `app/api/auth/**`.

**Tabelas/migrations previstas:** `profiles`, `user_preferences`, `private.user_roles`; policies/grants; trigger ou serviço idempotente de criação de perfil; migration “auth_profiles_foundation”.

**Dependências:** Fase 0; configuração Auth/SMTP/redirect URLs; versão fixada do cliente SSR; ambiente HTTPS de preview.

**Risco:** alto; sessão, refresh, cache indevido, enumeração de usuário e lockout do proprietário.

**Testes:** cadastro, confirmação, login, logout, reset, sessão expirada, cookies SSR, redirect, rate limit; RLS anon/aluno A/aluno B/admin; teste contra cache compartilhado com `Set-Cookie`.

**Rollback:** desligar flag V3 Auth, restaurar proxy/cookie legado e manter novas tabelas; não apagar usuário Auth.

**Critério de aceite:** dois usuários autenticam e não veem dados um do outro; recuperação é neutra; admin é bloqueado para aluno; login legado continua disponível apenas durante migração.

## Fase 2 — identidade nos dados e RLS por usuário

**Objetivo:** remover dependência funcional de `DEFAULT_USER_ID`, vincular dados ao Auth e fazer RLS/grants protegerem todas as entidades privadas.

**Arquivos afetados:** `lib/config/user.ts`, `lib/server/supabaseRest.ts`, serviços em `lib/server/**`, Route Handlers/Server Actions de home, attempts, reviews, performance, errors e simulations; testes SQL em `supabase/tests/**`.

**Tabelas/migrations previstas:** FKs de `question_attempts`, `error_notebook`, `topic_progress`, `review_schedule`, `study_sessions`, `simulations`; tabela de mapeamento legado; novas policies e grants; RPCs derivando `auth.uid()`; migration “multiuser_rls_and_backfill”.

**Dependências:** Fase 1; backup; usuário Auth proprietário; inventário completo de FKs/RPCs.

**Risco:** crítico; vazamento entre usuários, perda de dados ou funções `security definer` permissivas.

**Testes:** backfill idempotente; contagens/checksums; allow/deny CRUD por tabela; tentativa de BOLA/IDOR; RPC sem usuário, usuário errado e sessão expirada; advisors.

**Rollback:** flag para caminho legado, mapeamento reversível e colunas antigas mantidas; restaurar policies anteriores somente em ambiente controlado, nunca abrir acesso.

**Critério de aceite:** todo dado privado tem proprietário Auth e teste RLS; nenhuma operação comum recebe `p_user_id` arbitrário; contagens V2/V3 coincidem.

## Fase 3 — shell V3, navegação e persistência

**Objetivo:** entregar navegação mobile-first, grupos de rota, Server Components iniciais e restauração segura de filtros/checkpoints.

**Arquivos afetados:** `app/(student)/layout.tsx`, `app/(admin)/layout.tsx`, `components/layout/**`, `components/navigation/**`, `components/feedback/**`, `lib/state/**`, páginas Hoje/Estudar/Questões/Desempenho, `public/sw.js`, testes UI/E2E.

**Tabelas/migrations previstas:** `ui_checkpoints` e evolução de `user_preferences`, ou decisão documentada de absorção em sessões; migration “user_state_checkpoints”.

**Dependências:** Fase 2; design tokens e wireflows; política de storage local.

**Risco:** médio; regressão de navegação, hidratação, foco, cache por usuário e perda de estado.

**Testes:** 360/390/412/768/1280, teclado, safe area, zoom, reader/focus, reload, voltar/avançar, duas abas, logout limpando estado, rede lenta e offline shell.

**Rollback:** flag para shell V2; ignorar checkpoints V3; service worker versionado remove cache novo.

**Critério de aceite:** rotas do aluno/admin isoladas; URL restaura filtros; checkpoint não contém dado sensível; navegação completa por teclado/mobile.

## Fase 4 — conteúdo real e módulo Estudar

**Objetivo:** publicar conteúdo próprio e rastreável por item do edital, com recuperação ativa e progresso individual.

**Arquivos afetados:** `app/(student)/estudar/**`, `app/(admin)/admin/conteudos/**`, `components/study/**`, `components/admin/content/**`, `lib/domain/content/**`, `lib/services/study/**`, actions/handlers de conteúdo e progresso.

**Tabelas/migrations previstas:** `syllabus_versions`, `study_contents`, `study_content_blocks`, `content_source_links`, `active_recall_prompts`, `content_audit_log`; evolução de `syllabus_items`, `study_sessions`, `topic_progress`; migration “study_content_and_recall”.

**Dependências:** Fase 3; modelo editorial; fontes validadas; sanitização/schema de blocos; papéis admin/revisor.

**Risco:** alto; conteúdo sem fonte, vigência incorreta, XSS em blocos ou domínio inferido de leitura.

**Testes:** publicação bloqueada sem fonte; versionamento/vigência; preview mobile; recuperação antes de síntese; RLS aluno/admin; XSS; retomada; cálculo de progresso sem confundir conclusão e domínio.

**Rollback:** desabilitar rotas/flag do Estudar V3; despublicar unidades sem excluir; manter árvore V2 e dados coletados para reconciliação.

**Critério de aceite:** item piloto possui conteúdo publicado, fonte, recuperação e progresso; aluno retoma entre dispositivos; auditoria registra publicação.

## Fase 5 — sessões e motor de questões V3

**Objetivo:** materializar sessões, filtros avançados, questões relacionadas, prefetch limitado e resposta idempotente.

**Arquivos afetados:** `app/(student)/questoes/**`, `components/questions/**`, `lib/domain/questions/**`, `lib/services/question-query/**`, `lib/services/session/**`, actions/handlers de sessão/attempt, testes do motor.

**Tabelas/migrations previstas:** `study_session_items`, `saved_filters`, `content_question_links`, `question_relations`, `question_versions`, `question_reports`; evolução de `question_attempts` e `study_sessions`; migration “question_sessions_and_relations”.

**Dependências:** Fase 4; schema `QuestionQueryV1`; política de versionamento; pool de questões válido.

**Risco:** alto; seleção fora do edital, duplicação de attempts, exposição antecipada do gabarito e query lenta.

**Testes:** matriz de filtros; property tests de elegibilidade; idempotência/retry; sessão reproduzível por seed; questão anulada/visual/fonte; prefetch sem gabarito; load test e plano de query.

**Rollback:** manter endpoint/fluxo V2 atrás de flag; sessões V3 são independentes; suspender criação sem apagar attempts confirmadas.

**Critério de aceite:** sessão de 5/10/20 questões sobrevive a reload; nenhum item inelegível entra; retry não duplica progresso/XP; filtros salvos são privados.

## Fase 6 — revisões, erros, favoritos e cadernos

**Objetivo:** unificar recuperação por revisão/erro e entregar coleções privadas com optimistic UI seguro.

**Arquivos afetados:** `app/(student)/revisao/**`, `app/(student)/erros/**`, `app/(student)/favoritos/**`, `app/(student)/cadernos/**`, `components/collections/**`, `components/review/**`, serviços/actions correspondentes.

**Tabelas/migrations previstas:** `favorites`, `notebooks`, `notebook_items`; evolução de `review_schedule` e `error_notebook`; possível `error_classification_events`; migration “reviews_errors_collections”.

**Dependências:** Fase 5; política de revisão versionada; resolução de alvo polimórfico ou tabelas específicas decidida.

**Risco:** médio; conflito multiaba, itens órfãos e optimistic UI divergente.

**Testes:** RLS A/B; add/remove com falha e rollback; ordenação concorrente; agenda 24h/7d/30d; causa editável; erro resolvido/reaberto; coleção com questão arquivada.

**Rollback:** desligar coleções/recuperação V3; preservar tabelas; retornar telas V2 de revisão/erros; revalidar agregados.

**Critério de aceite:** favorito/caderno sincroniza e reverte falha; revisão e erro iniciam sessão correta; nenhum usuário acessa coleção alheia.

## Fase 7 — provas anteriores e simulados resilientes

**Objetivo:** oferecer provas históricas auditadas e modernizar simulado oficial/adaptativo com checkpoint, cartão mobile e conclusão idempotente.

**Arquivos afetados:** `app/(student)/provas-anteriores/**`, `app/(student)/simulados/**`, `components/exams/**`, `components/simulations/**`, serviços/RPCs de exams/simulations e admin de provas.

**Tabelas/migrations previstas:** evolução de `exams`, `simulations`, `simulation_questions`; policy/version/seed/checkpoint/idempotency; compatibilidade com `question_versions`; migration “previous_exams_and_resilient_simulations”.

**Dependências:** Fase 5; pares prova/gabarito validados; regras oficiais vigentes; UX de cartão/timer.

**Risco:** crítico; nota errada, resposta perdida, pool inválido ou mistura de edital histórico/corrente.

**Testes:** distribuição/pesos/mínimos; pool insuficiente; histórico fora do escopo; timer/pausa; reload/offline/retry; concorrência em duas abas; finalização repetida; resultado por disciplina/item.

**Rollback:** bloquear novas aplicações V3; permitir concluir sessões existentes pelo caminho compatível; manter dados/seed; reativar simulado V2 para novas criações.

**Critério de aceite:** simulado de 60 questões retoma sem perda, finaliza uma vez e calcula nota correta; prova anterior preserva fonte/gabarito e compatibilidade de edital.

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

**Objetivo:** entregar análise por período/disciplina/item e otimizar leitura com agregados, cursor, cache seguro e observabilidade.

**Arquivos afetados:** `app/(student)/desempenho/**`, `components/performance/**`, `lib/services/performance/**`, jobs, cache tags, instrumentação e dashboards técnicos.

**Tabelas/migrations previstas:** `performance_daily`, índices de cobertura, views `security_invoker` ou funções invoker; migration “performance_aggregates_and_indexes”.

**Dependências:** dados estáveis das fases 4–8; critérios de evidência; plano de retenção e observabilidade.

**Risco:** alto; agregado incorreto, cache entre usuários, métricas sem amostra e regressão de query.

**Testes:** reconciliação agregado/eventos; isolamento de cache; 7/30/90/todo; dados insuficientes; explain/analyze; carga; Web Vitals e ausência de PII em telemetria.

**Rollback:** desativar agregados e voltar a consultas canônicas limitadas; invalidar tags/cache; reconstruir `performance_daily`.

**Critério de aceite:** métricas batem com eventos, mostram amostra e filtros; p75 atende orçamento; nenhum cache mistura usuários.

## Fase 10 — painel administrativo completo e contract do legado

**Objetivo:** concluir governança do corpus, auditoria, reportes e remover acesso single-user somente após estabilidade.

**Arquivos afetados:** `app/(admin)/admin/**`, `components/admin/**`, serviços de fontes/conteúdo/questões/reportes/usuários, `proxy.ts`, remoção de `lib/config/user.ts` e `app/api/auth` legado, docs operacionais.

**Tabelas/migrations previstas:** completar `content_audit_log`, filas/status e índices; remover `access_key_hash` e compatibilidade `app_users` quando seguro; revogar funções/grants legados; migration “admin_governance_and_legacy_contract”.

**Dependências:** todas as fases anteriores; janela estável; backup restaurável; aprovação explícita do contract.

**Risco:** crítico; publicação indevida, privilégio excessivo ou rollback difícil após remoção do legado.

**Testes:** matriz admin/revisor/aluno; auditoria completa; publish/unpublish; reporte; upload seguro; RLS/advisors; restore drill; busca por referências ao cookie/ID legado.

**Rollback:** antes do contract, flag para admin anterior e login legado; após remoção, migration forward corretiva ou restore ensaiado conforme plano de migração.

**Critério de aceite:** admin opera corpus ponta a ponta com auditoria; aluno não acessa admin; zero referência runtime a `DEFAULT_USER_ID`, cookie próprio ou `access_key_hash`; relatório final aprovado.

## Release gate V3

1. Lint, testes unitários, integração, E2E, SQL e build verdes.
2. RLS allow/deny e grants revisados para toda tabela exposta.
3. Advisors sem achado externo aplicável de segurança/performance.
4. Migração ensaiada com contagens, backup e rollback.
5. Corpus sem questão real inválida e conteúdo oficial sem fonte.
6. Mobile/acessibilidade nos breakpoints definidos.
7. Web Vitals e queries dentro dos orçamentos.
8. Nenhuma credencial, endpoint, código, asset, texto ou conteúdo da referência clean-room incorporado.

