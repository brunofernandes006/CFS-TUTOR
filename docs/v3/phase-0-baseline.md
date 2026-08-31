# CFS Tutor V3 — baseline da Fase 0

- Data: 30/08/2026
- Branch/HEAD anterior: `main` / `3f8d8fff7d1ae5363bfa4ce5ad283e13f61e62fc`
- Escopo: somente documentação, contratos, flags inertes e tooling local/CI
- Produção/Supabase remoto/Vercel: não acessados nem alterados

## Ambiente anterior

| Item | Resultado |
|---|---|
| Node.js | `v25.9.0`; projeto e CI normatizados para Node 22+ |
| npm | `11.12.1` |
| dependências | `npm ci` inicial falhou por cache global/OneDrive e rede restrita; repetição autorizada com `.npm-cache` local instalou 680 pacotes, 0 vulnerabilidades |
| configuração de ambiente | `.env.local` ausente; nenhum segredo lido |
| Docker | CLI `29.3.1`; daemon não ativo |
| Supabase CLI | ausente inicialmente; `2.116.0` fixada como dev dependency após consulta à documentação oficial |
| Supabase local | sem `config.toml` antes da Fase 0 |

Avisos de instalação: dependências transitivas depreciadas (`whatwg-encoding`, `inflight` e versões antigas de `glob`). Não houve vulnerabilidade reportada por `npm audit` durante as instalações.

O lockfile anterior ainda declarava versão `1.3.0` e dependências removidas do `package.json` (`better-sqlite3`, `@opennextjs/cloudflare`, `wrangler` e tipos associados). A Fase 0 reconciliou o lock com o pacote V2 `2.0.0`, removeu somente entradas órfãs, adicionou a CLI Supabase fixada e comprovou o resultado com novo `npm ci`: 688 pacotes, 0 vulnerabilidades. A extensão do diff do lock decorre dessa dívida preexistente.

## Baseline anterior executado antes das alterações

| Comando | Saída | Tempo observado |
|---|---|---:|
| `npm run lint` | exit 0; 0 erros, 1 aviso em `components/streaming/TopNav.tsx:46` por `window.location.assign()` interno | 41,100 s |
| `npm run test:ci` | exit 0; 9 suítes, 31 testes, 0 snapshots | 20,227 s (Jest: 16,737 s) |
| `npm run build` | exit 0; Next.js 16.3.0, compilação 12,1 s, TypeScript 3,1 s, 33 páginas estáticas | 24,566 s |

O Jest força encerramento e avisa sobre possível handle aberto. É dívida preexistente; investigar com `--detectOpenHandles` sem mascarar o baseline.

## Banco e migrations V2

- 20 arquivos SQL, versões locais únicas `001`–`020`: `014_answer_key_annulment.sql`, `015_prevent_annulled_real_questions.sql` e `016_simulation_current_edital_scope.sql` preservam a ordem remota informada.
- Checksums completos: `docs/v3/baselines/v2-migrations.sha256.json`. O hash usa texto canônico LF para produzir o mesmo resultado em checkouts Windows e Linux; a primeira execução remota revelou e documentou a divergência CRLF.
- 22 tabelas públicas com `ENABLE ROW LEVEL SECURITY`: `answer_key_candidates`, `app_users`, `disciplines`, `error_notebook`, `exam_incidence`, `exams`, `question_attempts`, `question_candidates`, `question_sources`, `questions`, `review_schedule`, `simulation_questions`, `simulations`, `source_document_pages`, `source_documents`, `source_extractions`, `source_relationships`, `source_visual_assets`, `study_sessions`, `syllabus_candidates`, `syllabus_items`, `topic_progress`.
- Tabelas privadas por proprietário: `question_attempts`, `error_notebook`, `topic_progress`, `review_schedule`, `study_sessions`, `simulations`; `simulation_questions` herda propriedade por `simulation_id`.
- `app_users.access_key_hash` e todas as FKs V2 permanecem inalteradas.
- Cinco RPCs V2 `SECURITY DEFINER` recebem `p_user_id`, usam `search_path = public` e são executáveis somente por `service_role` após a migration 018.
- Nenhuma migration foi criada nem teve SQL editado. Após reconciliação remota somente leitura informada pelo operador, `014_prevent_annulled_real_questions.sql` foi renomeada localmente para `015_prevent_annulled_real_questions.sql`.

O hash antes e depois do rename permaneceu `82b8c6bcabc98697c82c2867f18bcbf5f869ab3fa235e9080c181c7ec1ce7d7d`, provando que o conteúdo SQL não mudou. Nenhum comando `migration repair` foi usado e nenhum banco remoto foi alterado nesta execução.

## Questões, fontes e simulados

- `/api/questions` carrega até 2.000 questões e filtra em memória; exclui `correct_option_index` e `explanation`, bloqueia visual ausente e questão real sem item do edital.
- `/api/attempts` corrige pela RPC atômica e só depois busca explicação/fonte. O fluxo não é idempotente na V2.
- Questão real exige `exam_id`, fonte de prova e fonte de gabarito; promoção exige par validado. Anulação é explícita e protegida por trigger.
- Simulado oficial preserva 20/20/20 e pesos 3/2/5; adaptativo aceita 10–60. `get_simulation_v2` omite acerto/gabarito/explicação enquanto `IN_PROGRESS`.
- Resposta de simulado V2 pode ser sobrescrita enquanto em andamento e finalização repetida não é idempotente. Esses comportamentos ficam congelados apenas nas rotas V2 e serão substituídos, não alterados, nas fases 5/7.

## Autenticação e segurança

- Autoridade única atual: cookie HttpOnly `cfs_access`, derivado de `SUPABASE_SERVICE_ROLE_KEY`, validado no `proxy.ts`; domínio fixo `CFS_DEFAULT_USER_ID`.
- `POST /api/auth/login` compara SHA-256 com `app_users.access_key_hash`; não existe Supabase Auth.
- 27 pares rota/método estão inventariados; somente login é `PUBLIC`, todos os demais são `LEGACY_OWNER`.
- Métodos mutáveis exigem mesma origem. APIs recebem `Cache-Control: no-store`; há headers contra MIME sniffing, frame, permissões e isolamento de origem.
- `lib/server/supabaseRest.ts` é `server-only`, usa `service_role` e `cache: no-store`. Seu alcance amplo é dívida aceita apenas na V2.
- Service worker cacheia shell/assets estáticos, não `/api/**`, navegações ou documentos.

## Performance e dívida observada

| Achado | Severidade de execução | Destino |
|---|---|---|
| `/api/questions` busca até 2.000 linhas e filtra/sorteia no Node | alto antes da Fase 5 | seleção paginada/no banco |
| desempenho busca até 5.000 tentativas e agrega em memória | alto antes da Fase 9 | cursor/agregados medidos |
| caderno/revisões carregam catálogos inteiros em paralelo | médio | batch/join paginado |
| tentativa faz RPC + até 2 selects após commit | médio | feedback transacional V3 |
| Jest usa `--forceExit` e reporta possível handle aberto | médio de qualidade | diagnóstico separado |
| lint possui 1 aviso de navegação interna | baixo | correção fora do escopo funcional da Fase 0 |
| `@types/node` declara v20, embora runtime mínimo agora seja 22 | baixo | alinhar em mudança de dependência futura |
| nenhum teste E2E/mobile automatizado atual | alto para gates UX futuros | adicionar antes da Fase 3 |

Não foi possível medir contagens reais, latência de produção, EXPLAIN ou advisors sem acessar ambiente remoto; inventar esses números violaria o baseline.

## Artefatos preparatórios

- ADR 007 disciplina flags e gates.
- Contratos de invariantes, auth por rota, acesso ao banco, flags, mutabilidade de resposta e gate da Fase 1.
- Flags server-only desligadas e sem consumidor V2.
- Teste Jest de checksums/mapa/flags/harness.
- Supabase CLI local fixada, configuração não vinculada, fixture V2 sintética e pgTAP para fresh/upgrade.
- CI existente passou a executar o contrato estático; um workflow manual, sem segredos e sem link remoto, reproduz fresh/upgrade. Nenhuma ação de deploy foi adicionada.

## Estado posterior inicial, antes da reconciliação `014` → `015`

| Comando | Saída | Tempo observado |
|---|---|---:|
| `npm run test:phase0` | exit 0; 1 suíte, 4 contratos | 1,813 s |
| `npm ci --cache .npm-cache` | exit 0; 688 pacotes, 0 vulnerabilidades | 20,753 s |
| `npm run lint` após instalação limpa | exit 0; mesmos 0 erros e 1 aviso V2 | 33,773 s |
| `npm run test:ci` após instalação limpa | exit 0; 10 suítes, 35 testes, 0 snapshots | 17,382 s (Jest: 14,039 s) |
| `npm run build` após instalação limpa | exit 0; mesmas rotas e 33 páginas estáticas; compilação 9,2 s, TypeScript 1,778 s | 19,289 s |
| `npm run test:db:fresh` antes da stack | exit 1; daemon Docker inativo | bloqueio ambiental investigado |
| `npm run db:start` após iniciar Docker | exit 1; SQLSTATE `23505`, versão `014` duplicada | falha de histórico confirmada |
| `npm run test:db:upgrade` | não alcançado; depende de fresh/start verde | bloqueado por `014` |

Não houve regressão de lint, testes, build, rotas ou comportamento V2. O ganho de tempo posterior decorre de caches locais e não constitui orçamento de produção.

### Revalidação após reconciliação `014` → `015`

| Comando | Resultado |
|---|---|
| `npm run db:start` | exit 0; aplicou `001`–`020` na ordem, incluindo `014`, `015`, `016` |
| `npm run test:db:fresh` | exit 0; reset fresh e 24/24 testes pgTAP aprovados |
| `npm run test:db:upgrade` | exit 0; fixture V2 carregada, nenhuma migration posterior pendente e 11/11 testes pgTAP aprovados |
| `npm run lint` | exit 0 em 7,567 s; 0 erros e o mesmo aviso V2 |
| `npm run test:ci` | exit 0 em 3,134 s; 10 suítes e 35/35 testes aprovados |
| `npm run build` | exit 0 em 6,153 s; mesmas rotas e 33 páginas estáticas |
| `git diff --check` | exit 0; somente avisos de futura normalização LF→CRLF |
| `npm run db:stop` | exit 0; stack local parada com backup local preservado |

O pgTAP fresh confirmou 22 tabelas, RLS, grants das cinco RPCs V2, pesos/distribuição oficial, proteção de anulação e rastreabilidade. O teste de upgrade preservou proprietário, par de fontes, questão real, tentativa, caderno de erros, progresso, revisão e simulado da fixture sintética.

## Gates e decisão

- Verdes: ADRs 001–007; contratos; checksums; mapa auth; histórico local `014`/`015`; fresh; upgrade fixture; 35 pgTAP; 22 tabelas/RLS; flags inertes; lint; 35 testes Jest; build; harness CI preparado.
- Pendentes: execução do workflow no provedor de CI, smoke mobile, aprovação do ciclo de retenção/exclusão e identificação/ensaio de backup e staging sem alterar produção.
- Vermelhos: nenhum gate técnico local.

Decisão reavaliada: **FASE 1 BLOQUEADA**. O bloqueio SQL foi eliminado, mas o contrato vigente exige todos os itens de [phase-1-entry-gate.md](./contracts/phase-1-entry-gate.md) verdes. Ainda faltam evidências operacionais/UX e a decisão de retenção; esta conclusão não inicia a Fase 1.

## Fechamento complementar dos gates — 30/08/2026

### Validação final local

| Comando/verificação | Resultado |
|---|---|
| `npm ci` | exit 0; 684 pacotes, 0 vulnerabilidades; avisos transitivos depreciados mantidos como dívida |
| `npm run lint` | exit 0; 0 erros e 1 warning V2 conhecido em `TopNav.tsx:46` |
| `npm run test:ci` | exit 0; 10 suítes e 35/35 testes |
| `npm run build` | exit 0; Next.js 16.3.0, 33 páginas estáticas e todas as rotas esperadas |
| `npm run test:db:fresh` | exit 0; migrations `001`–`020` e 24/24 pgTAP |
| `npm run test:db:upgrade` | exit 0; fixture V2 preservada, nenhuma migration pendente e 11/11 pgTAP |
| `git diff --check` | registrado antes do commit/push final; sem erro de whitespace |

O manifesto de migrations passou a calcular SHA-256 sobre texto canônico LF. Isso corrige a única falha do primeiro CI Linux sem alterar um byte lógico dos arquivos SQL.

### Smoke mobile e comportamento V2

A evidência completa está em [phase0-mobile-smoke.md](./baselines/phase0-mobile-smoke.md). As sete telas principais foram verificadas em 360, 390, 412, 768 e 1440 px sem overflow horizontal. Login, resposta de questão, revisão, caderno, desempenho, simulado/resultado, menu, scroll, reload, voltar/avançar e erro/recuperação de rede funcionaram.

Foram preservadas como dívida: alvos essenciais de 36–42 px, ausência de padding de safe area e grants de tabela para `service_role` não reproduzidos pelas migrations fresh. O smoke precisou de grant somente no container local; nenhum SQL versionado ou remoto foi alterado.

### Política de conta e operação

- [ADR 008](../adr/008-v3-account-lifecycle-retention.md): invite-only, e-mail confirmado, reset pelo Supabase Auth, suspensão, exclusão privada após 30 dias, auditoria mínima anonimizada por 12 meses e nenhuma senha armazenada pela aplicação.
- [backup-staging-plan.md](./contracts/backup-staging-plan.md): backup/restore, variáveis, barreiras contra produção e rollback definidos.
- A sessão não possui credencial para identificar com segurança o project ref de produção, e não há evidência de staging Supabase separado nem restore drill. Esses fatos permanecem gates operacionais, não são preenchidos por suposição.
