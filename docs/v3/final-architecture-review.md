# Revisão final independente pós-correções — CFS Tutor V3

Data: 30/08/2026
Escopo: segunda revisão documental, executada após a correção da especificação. Nenhum código, banco, migration ou ambiente foi alterado.

## Regra desta revisão

Esta revisão não presume aprovação por os documentos terem sido editados. Cada BLOQUEADOR e ALTO da revisão anterior foi novamente confrontado com:

- os nove documentos de `docs/v3/`;
- ADRs 001–006 em `docs/adr/`;
- código, migrations e testes V2 atuais;
- `PRODUCT_V2.md`, `AGENTS.md` e `docs/gran-reference/`.

“RESOLVIDO” nesta tabela significa que a especificação agora possui uma decisão única, ordem expand/contract, testes, rollback e gate de aceite suficientes para orientar a implementação. Não significa que a migration ou o teste já foi executado. A execução continua proibida fora da ordem do roadmap.

## Resultado executivo

Os quatro BLOQUEADORES e os dez achados ALTOS foram **RESOLVIDOS na especificação**. Não restou alternativa aberta sobre identidade, autoridade de rota, RPCs, gabarito, versionamento, política de revisão, integração de simulado, RLS/grants, cache, paginação ou harness de banco.

Permanecem correções MÉDIAS/BAIXAS da revisão anterior que podem ser fechadas na Fase 0 ou na fase funcional indicada, sem permitir que migrations de fases posteriores ultrapassem seus gates. Por esse motivo, a decisão desta revisão é **APROVADO COM CORREÇÕES**, e não aprovação irrestrita.

## Achado → Correção → Documento

| Achado anterior | Severidade | Status | Correção normativa | Documento principal |
|---|---|---|---|---|
| AR-01 Identidade/backfill sem estratégia | BLOQUEADOR | **RESOLVIDO** | `app_users` vira ponte; proprietário Auth recebe UUID próprio; mapa privado auditável; linha compatível para novos Auth; sombra Auth; backfill idempotente; cutover e contract separados | [ADR 001](../adr/001-v3-identity-and-auth-cutover.md), `multiuser-auth.md`, `migration-plan.md` |
| AR-02 Cookie legado misturado com Auth | BLOQUEADOR | **RESOLVIDO** | autoridade única `PUBLIC/LEGACY_OWNER/AUTH_V3` por rota/método; piloto `/v3`; nunca fallback; cookie legado expirado no cutover | [ADR 001](../adr/001-v3-identity-and-auth-cutover.md), `navigation.md`, `multiuser-auth.md` |
| AR-03 RPCs definer com `p_user_id` | BLOQUEADOR | **RESOLVIDO** | RPC V3 deriva `auth.uid()`, rejeita nulo, valida owner; wrapper exposto invoker; função definer privada com `search_path=''`; RPC V2 segue service-role-only | [ADR 002](../adr/002-v3-database-authorization-and-rpcs.md), `multiuser-auth.md`, `migration-plan.md` |
| AR-04 Exposição antecipada de gabarito | BLOQUEADOR | **RESOLVIDO** | apresentação em `question_versions`; correção em `private.question_answer_versions`; DTO público fechado; submit/feedback; regras de anulada/simulado; revoke e testes de acesso direto | [ADR 003](../adr/003-v3-question-answer-secrecy.md), `question-engine.md`, `data-model.md` |
| AR-05 `service_role` em fluxo comum | ALTO | **RESOLVIDO** | clientes user/admin/migration separados; lint/architecture test proíbe cliente admin em aluno; operações comuns user-scoped/RLS | [ADR 002](../adr/002-v3-database-authorization-and-rpcs.md), `product-architecture.md`, roadmap Fase 2 |
| AR-06 Versionamento de edital conflita com IDs | ALTO | **RESOLVIDO** | `syllabus_items` estável + `syllabus_version_items`; sessão/simulado fixa versão; backfill V2 antes de constraints | [ADR 005](../adr/005-v3-curriculum-question-versioning.md), `data-model.md`, roadmap Fase 4 |
| AR-07 `question_versions` quebra histórico | ALTO | **RESOLVIDO** | versão-baseline, FK nula, batch idempotente, dual-write, reconciliação e NOT NULL tardio; histórico não é recalculado | [ADR 005](../adr/005-v3-curriculum-question-versioning.md), `data-model.md`, `migration-plan.md` |
| AR-08 Simulados fora do motor pedagógico | ALTO | **RESOLVIDO** | finalização única gera exatamente um attempt por item, contexto SIMULATION, versão/gabarito capturados e política canônica sem dupla contagem | [ADR 006](../adr/006-v3-attempt-review-simulation-consistency.md), `question-engine.md`, roadmap Fase 7 |
| AR-09 Duas políticas de revisão | ALTO | **RESOLVIDO** | `ReviewPolicyV3` única/versionada, paridade SQL/TS e regra 24h/7d/30d/60d com evidência; SQL V2 não é fonte V3 | [ADR 006](../adr/006-v3-attempt-review-simulation-consistency.md), `data-model.md`, roadmap Fases 0/5 |
| AR-10 RLS/grants/admin sem matriz | ALTO | **RESOLVIDO** | matriz por classe/operação, grants separados de RLS, policies completas, `requireAdmin`, views invoker e testes anon/A/B/admin/service-role | [ADR 002](../adr/002-v3-database-authorization-and-rpcs.md), `multiuser-auth.md`, roadmap Fase 2 |
| AR-11 Colisão de rotas/rollback falso | ALTO | **RESOLVIDO** | piloto `/v3`; route groups não duplicam pathname; uma implementação por URL no cutover; manifest/SW alterados só no corte | `navigation.md`, `product-architecture.md`, roadmap Fases 1–3 |
| AR-12 Cache/local storage entre contas | ALTO | **RESOLVIDO** | cache compartilhado só para função global pura; private no-store/request; allowlist local por Auth; purge; SW com allowlist exata; teste A→B | [ADR 004](../adr/004-v3-cache-and-local-state.md), `ux-performance.md`, roadmap Fases 1/3/9 |
| AR-13 N+1, limites e paginação | ALTO | **RESOLVIDO** | cursor composto, limites 25/100, joins batch, seleção no banco, proibição de truncar 5.000 e correção por fase com EXPLAIN | `data-model.md`, `question-engine.md`, `migration-plan.md`, roadmap Fases 5/6/9 |
| AR-14 Sem harness SQL/RLS | ALTO | **RESOLVIDO** | baseline Jest e harness Supabase local são gate da Fase 0; banco novo + upgrade V2 + matriz de roles; nenhuma migration funcional antes disso | `migration-plan.md`, roadmap Fase 0 |

## Verificação independente dos quatro bloqueadores

### 1. Identidade e compatibilidade V2

O desenho agora é executável sem reatribuição massiva:

1. proprietário Auth é criado administrativamente e recebe o UUID emitido pelo Supabase Auth;
2. `private.legacy_user_auth_map` liga esse UUID ao único UUID V2 e registra estado/lote/checksum;
3. `app_users.auth_user_id` materializa a ponte;
4. tabelas privadas tocadas recebem owner Auth sombra, sem remover a FK antiga;
5. contas Auth novas recebem linha `app_users` de compatibilidade sem `access_key_hash`, permitindo usar FKs V2 durante coexistência;
6. novas operações escrevem domínio compatível + owner Auth na mesma transação;
7. no cutover o runtime para de ler o legado; no contract posterior remove-se `access_key_hash` e só se remove `app_users` com zero FK.

Isso preserva IDs, timestamps, attempts, revisões, erros, sessões e simulados históricos. Reexecução é no-op ou atualiza apenas linhas divergentes, com contagens/checksums.

### 2. Uma autoridade por rota

O piloto `/v3` resolve a colisão física de páginas Next.js e a mistura de cookies. O mapa de rotas é allowlist server-only e deny-by-default. Não existe `LEGACY_OR_AUTH`. O cutover exige converter todas as rotas comuns em uma release e expirar o cookie legado. Rollback antes do contract volta a release/flag prevista para o proprietário mapeado, sem aceitar dois mecanismos no mesmo request.

### 3. RPCs e RLS

O fluxo V3 não promove os RPCs V2. A superfície Data API é um wrapper `security invoker` sem `p_user_id`; a função privilegiada, quando inevitável, fica em schema não exposto, restringe `search_path`, revoga grants e revalida `auth.uid()`/owner. Operação administrativa possui contrato separado e auditado. A matriz cobre tanto grants quanto RLS e testa acesso REST direto, evitando que `service_role` mascare policy quebrada.

### 4. Sigilo de resposta

O modelo administrativo e o apresentável estão fisicamente separados. `PublicQuestionDTO` tem allowlist e o prefetch reutiliza o mesmo contrato. Gabarito/explicação só aparecem no feedback após uma submissão válida quando o modo permite; no simulado, apenas depois da finalização. Anuladas não recebem resposta inventada nem alimentam domínio/erro. Testes tentam acesso por tabela, view, REST, GraphQL, RPC, logs e cache.

## Verificação dos achados ALTOS

### Propriedade, service role e administração

O helper privilegiado genérico deixa de ser arquitetura-alvo. O roadmap exige módulo user-scoped para aluno e módulo admin `server-only`, com teste de import. Papel canônico fica em schema privado; autenticar como admin não concede acesso por si só. O backend valida sessão, papel e operação.

### Tentativas, revisões, erros e simulados

O núcleo transacional ficou fechado: validar → reservar idempotência → gravar attempt → progresso/revisão/erro → outbox. XP/metas/agregados não fazem a tentativa falhar. A política adaptativa preserva a exigência de evidência do `PRODUCT_V2.md`. Simulado produz attempts exatamente uma vez na finalização e mantém versão histórica. Caderno de erros só recebe erro elegível; anulada/inválida não cria ocorrência.

### Cache e persistência

As regras agora distinguem `React.cache` por request de `use cache`/ISR compartilhado. O namespace local não guarda conteúdo, token ou gabarito e deve ser apagado antes da navegação na troca de conta. O service worker mudou de regra conceitual “por destination” para allowlist exata de paths públicos. O teste de troca A→B é gate explícito.

### Performance

As correções deixaram de ser adiadas integralmente para a Fase 9. Cada rota tocada deve nascer paginada/batch; a especificação proíbe download de catálogo para sorteio/join e truncamento silencioso de attempts. Agregados sofisticados continuam na Fase 9, o que evita complexidade precoce sem preservar N+1.

### Baseline e testes

A ausência atual de `node_modules`/Jest continua sendo fato do checkout, não foi escondida. Agora isso impede a conclusão da Fase 0 e, por dependência, qualquer migration de fase seguinte. O harness deve aplicar desde zero e fazer upgrade de fixture V2, pois mock/unit test não prova RLS.

## Compatibilidade e rastreabilidade preservadas

- Next.js + TypeScript, Supabase/PostgreSQL e PWA permanecem a plataforma.
- A referência Gran continua limitada a resultados genéricos de UX clean-room; nenhum contrato, endpoint, asset ou conteúdo proprietário foi introduzido.
- Conteúdo oficial continua exigindo fonte validada e projeção pública mínima; extração/candidatos/fontes brutas permanecem administrativos.
- Questão real continua exigindo prova e gabarito oficial rastreáveis.
- Simulado oficial preserva distribuição, pesos, versão do edital e histórico.
- Revisão adaptativa preserva amostra/evidência, e leitura não vira domínio.
- Questões anuladas, visuais ausentes e histórico fora do edital mantêm as regras do `PRODUCT_V2.md`.

## Correções não altas ainda requeridas

Estas pendências não reabrem BLOQUEADOR/ALTO, mas impedem uma aprovação sem ressalvas:

| Pendência | Severidade anterior | Gate |
|---|---|---|
| fechar modelo tipado de favoritos/cadernos | MÉDIO | ADR/modelo antes da Fase 6 |
| simplificar materializações de XP/streak/performance | MÉDIO | decisão antes da Fase 8; ledger/outbox já é canônico |
| confirmar política invite-only e ciclo de retenção/exclusão | MÉDIO | aceite de produto na Fase 0/1 |
| definir projeção pública exata de citações/assets de fonte | MÉDIO | contrato editorial antes da Fase 4 |
| fechar regra de alteração de resposta nos modos que não são simulado | MÉDIO | contrato antes da Fase 5 |
| instalar dependências, ler docs locais do Next 16 e fixar runtime | BAIXO | Fase 0 |
| reconciliar histórico das migrations com prefixo `014` e timestamps V3 | BAIXO | inventário da Fase 0 |

Nenhuma dessas pendências autoriza pular o gate correspondente. Em especial, nenhuma migration funcional começa antes de baseline, harness e ADRs aprovados.

## Decisão

**APROVADO COM CORREÇÕES.**

Justificativa: a especificação eliminou os quatro BLOQUEADORES e corrigiu todos os achados ALTOS com decisões normativas, testes, rollback e critérios de aceite. A implementação deve começar exclusivamente pela Fase 0 documental/técnica e parar em qualquer gate não cumprido. A aprovação não autoriza código, migration ou produção nesta entrega e não permite iniciar fase funcional enquanto uma pendência daquela fase estiver aberta.
