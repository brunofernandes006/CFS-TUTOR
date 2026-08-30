# Revisão final de arquitetura — CFS Tutor V3

Data da revisão: 30/08/2026  
Escopo: revisão documental e estática; nenhum código, banco, migration ou ambiente de produção foi alterado.

## Decisão executiva

**NÃO APROVADO.**

Os nove documentos de `docs/v3/` formam uma boa direção de produto, preservam adequadamente o uso clean-room da referência Gran e cobrem quase todo o escopo funcional solicitado. Contudo, ainda não constituem uma especificação segura para iniciar migrations. Há quatro bloqueadores: identidade legada sem estratégia única, coexistência perigosa entre o cookie pessoal e Supabase Auth, RPCs privilegiados que aceitam `p_user_id` e ausência de uma fronteira física/contratual que impeça a leitura antecipada do gabarito.

A implementação pode ser aprovada depois que os bloqueadores e os achados altos marcados como pré-requisito de fase forem incorporados aos documentos, sobretudo ao `migration-plan.md`, `data-model.md`, `multiuser-auth.md`, `question-engine.md` e `implementation-roadmap.md`. Esta decisão não reprova a visão V3; reprova começar a executar o schema enquanto decisões fundamentais permanecem alternativas abertas.

## Material comparado e método

Foram comparados entre si os nove documentos:

1. `product-architecture.md`;
2. `navigation.md`;
3. `study-module.md`;
4. `multiuser-auth.md`;
5. `question-engine.md`;
6. `data-model.md`;
7. `ux-performance.md`;
8. `migration-plan.md`;
9. `implementation-roadmap.md`.

O cruzamento incluiu `PRODUCT_V2.md`, `AGENTS.md`, os seis arquivos de `docs/gran-reference/`, o App Router e Route Handlers atuais, `proxy.ts`, `lib/server/**`, todas as migrations `001` a `020` e os dez arquivos de teste em `__tests__/`.

A suíte não pôde ser executada neste checkout: `npm test -- --runInBand` falhou antes da coleta porque `jest` não está instalado/disponível (`node_modules` ausente). Assim, a análise dos testes atuais foi estática. Isso não invalida os achados de arquitetura, mas impede usar o estado verde da V2 como baseline de regressão.

## Baseline verificado

- O app é Next.js 16.3, React 19, TypeScript e PWA. A aplicação atual é majoritariamente Client Components consumindo Route Handlers.
- A autenticação V2 é um portão pessoal: `proxy.ts` valida o cookie global `cfs_access`, derivado da `SUPABASE_SERVICE_ROLE_KEY`; `app/api/auth/login/route.ts` confere a chave do único `app_users` conhecido.
- Todas as operações de aluno usam `lib/server/supabaseRest.ts`, que envia `service_role`. Portanto, as políticas RLS atuais não isolam essas chamadas; a separação depende do filtro explícito com `DEFAULT_USER_ID`.
- `question_attempts`, `error_notebook`, `topic_progress`, `review_schedule`, `study_sessions` e `simulations` já possuem `user_id`, mas esse campo referencia `public.app_users(id)`, não `auth.users(id)`.
- `simulation_questions` possui propriedade indireta por `simulations.user_id`; duplicar `user_id` nela criaria duas fontes de verdade.
- Catálogos e rastreabilidade (`disciplines`, `syllabus_items`, `exams`, `questions`, `exam_incidence`, `source_documents`, relações e candidatos editoriais) são globais ou administrativos e não devem ganhar `user_id` só para uniformizar o schema.
- Os RPCs `record_question_attempt_v2`, `create_simulation_v2`, `answer_simulation_question_v2`, `finalize_simulation_v2` e `get_simulation_v2` são `SECURITY DEFINER`, ficam em `public`, usam `search_path = public` e aceitam `p_user_id`. A migration `018` reduz o risco atual ao revogar execução de `public`, `anon` e `authenticated`, concedendo-a apenas a `service_role`.
- `get_simulation_v2` já omite correção, explicação e gabarito enquanto o simulado está `IN_PROGRESS`. Esse contrato deve ser preservado.
- `PRODUCT_V2.md` exige edital vigente, rastreabilidade de prova/gabarito, tratamento correto de anuladas e visuais, amostra mínima para domínio e PWA sem cache de API/páginas autenticadas.
- A referência Gran foi usada nos documentos somente para padrões genéricos de UX: hierarquia, filtros progressivos/salvos, retomada, paginação, prefetch limitado e feedback de conectividade. Não foi identificada instrução de copiar código, assets, texto ou integração proprietária.

## Contradições e decisões ainda abertas

| Tema | Contradição ou ambiguidade | Resolução necessária |
|---|---|---|
| Identidade | `product-architecture.md` define `profiles.id = auth.users.id`; `data-model.md` deixa FK direta ou via perfil em aberto; `migration-plan.md` propõe “mapear UUID ou reatribuir FKs”. | Escolher um único modelo expand/contract antes da primeira migration. |
| Usuário legado | O roadmap cria `profiles` na Fase 1, mas só decide absorver/remover `app_users` na Fase 10. | Tratar `app_users` como ponte de identidade, sem criar uma segunda identidade concorrente. |
| Consistência da tentativa | `data-model.md` aceita “atômica ou por outbox”; o motor atual é transacional e XP/metas são projeções novas. | Núcleo pedagógico atômico; evento de outbox na mesma transação; projeções de XP/metas assíncronas e idempotentes. |
| Acesso a questões | Arquitetura permite leitura de catálogo publicado por autenticados, enquanto `ux-performance.md` proíbe prefetch de gabarito; hoje enunciado e resposta estão na mesma linha de `questions`. | Expor somente uma projeção segura; nunca conceder `SELECT` do aluno à relação que contém gabarito. |
| Mutações | `product-architecture.md` prefere Server Actions para mutações internas; o motor de questões/simulado precisa de idempotência, retry e contrato HTTP estável. | Reservar Server Actions para formulários simples; manter Route Handlers/RPCs versionados para tentativa, checkpoint e simulado. |
| Revisão | `question-engine.md` prevê política versionada, mas não identifica a fonte canônica. O serviço TypeScript e o RPC SQL V2 já produzem intervalos diferentes. | Escolher e testar uma única política antes de evoluir tentativas. |
| Cadastro | `navigation.md` publica `/cadastro`; `multiuser-auth.md` descreve signup, mas não define se o produto é aberto, por convite ou sujeito a aprovação. | Fixar política de admissão e autorização de conteúdo antes de expor a rota. |
| Checkpoints/agregados | `ui_checkpoints` e `goal_progress` aparecem como “nova ou absorvida/view”; isso não é especificação implementável. | Resolver cada entidade como tabela, coluna, view ou item removido do escopo. |

## Achados

### AR-01 — Identidade canônica e backfill sem estratégia única

**Classificação:** BLOQUEADOR  
**Documento/arquivo afetado:** `docs/v3/product-architecture.md`, `data-model.md`, `multiuser-auth.md`, `migration-plan.md`, `implementation-roadmap.md`; `supabase/migrations/003_core_v2.sql`, `004_bootstrap_single_user.sql`.

**Problema:** seis tabelas privadas referenciam o UUID de `public.app_users`, inclusive o usuário bootstrap `00000000-0000-4000-8000-000000000001`. Os documentos alternam entre reutilizar esse UUID em `auth.users`, criar `profiles.id = auth.users.id` e reescrever todas as FKs. Não há uma decisão operacional nem prova de que o fluxo normal de criação do Supabase Auth aceitará o UUID legado.

**Impacto:** uma migration direta de FK pode falhar, apagar associações, duplicar o proprietário ou deixar dados V2 órfãos. Rollback depois de reescrever todas as FKs seria arriscado.

**Correção proposta:** adotar expand/contract explícito: (1) adicionar `app_users.auth_user_id uuid null unique references auth.users(id)`; (2) criar o proprietário Auth; (3) preencher e verificar a ponte; (4) manter `app_users.id` como PK de domínio durante a coexistência; (5) políticas resolvem `auth.uid()` pela ponte ou colunas Auth sombreadas, sem drop/rename; (6) migrar FKs em lotes somente se houver benefício comprovado; (7) contrair `app_users` apenas depois de duas releases e restore drill. Registrar contagens e checksums por tabela.

**Precisa alterar o roadmap:** **sim**. A decisão deve entrar na Fase 0; Fases 1 e 2 precisam ser reescritas como expand, backfill, dual-read controlado, validação e contract tardio.

### AR-02 — Coexistência do cookie pessoal com Supabase Auth pode misturar identidades

**Classificação:** BLOQUEADOR  
**Documento/arquivo afetado:** `docs/v3/multiuser-auth.md`, `migration-plan.md`, `implementation-roadmap.md`, `navigation.md`; `proxy.ts`, `app/api/auth/login/route.ts`, `lib/config/user.ts` e Route Handlers privados.

**Problema:** a Fase 1 promete manter o acesso legado sob flag, mas não define precedência, invalidação ou escopo dos dois cookies. O cookie V2 representa acesso global; após passar pelo proxy, as APIs usam o mesmo `DEFAULT_USER_ID`. Um usuário Auth novo poderia alcançar uma rota ainda legada e operar como o proprietário V2.

**Impacto:** vazamento ou alteração de dados entre usuários, além de rollback inconsistente. É o maior conflito entre a autenticação pessoal e Supabase Auth.

**Correção proposta:** definir modos mutuamente exclusivos por release/rota. Opção mais segura: piloto V3 em prefixo isolado (`/v3`) ou allowlist de contas; APIs V3 exigem sessão Auth e nunca aceitam cookie legado; APIs V2 continuam inacessíveis a contas Auth não mapeadas. Login/logout Auth apagam `cfs_access`; login legado não cria sessão Auth. O cutover só ocorre após todas as rotas privadas deixarem de usar `DEFAULT_USER_ID`. Não usar “aceitar qualquer um dos cookies” como fallback.

**Precisa alterar o roadmap:** **sim**. Acrescentar matriz rota × modo de autenticação, teste de cookie cruzado e gate que proíbe novos usuários antes da Fase 2.

### AR-03 — RPCs `SECURITY DEFINER` aceitam identidade arbitrária

**Classificação:** BLOQUEADOR  
**Documento/arquivo afetado:** `docs/v3/multiuser-auth.md`, `question-engine.md`, `migration-plan.md`, `implementation-roadmap.md`; migrations `006`, `007`, `008`, `013`, `016` e `018`.

**Problema:** os RPCs legados estão em `public`, fixam `search_path = public` e recebem `p_user_id`. Eles são seguros hoje apenas porque a migration `018` limita EXECUTE a `service_role`. Conceder esses RPCs a `authenticated` durante a migração criaria uma vulnerabilidade de autorização horizontal; `SECURITY DEFINER` não é protegido pelas políticas RLS do chamador.

**Impacto:** um aluno poderia registrar tentativas, ler ou responder simulados em nome de outro usuário. Um `search_path` amplo também aumenta a superfície de shadowing de objetos.

**Correção proposta:** nunca conceder os nomes/assinaturas legados a `authenticated`. Criar RPCs V3 novos em schema não exposto ou expor wrappers mínimos que: derivem o ator com `(select auth.uid())`, rejeitem nulo, resolvam a ponte de identidade, usem `security definer set search_path = ''`, qualifiquem todo objeto, validem propriedade dentro da função e tenham `PUBLIC` revogado antes do grant explícito. Manter RPCs V2 somente para `service_role` até o contract.

**Precisa alterar o roadmap:** **sim**. A Fase 2 deve exigir migration atômica “criar seguro → testar → conceder”, nunca “alterar grant do RPC existente”.

### AR-04 — Modelo proposto permite exposição antecipada de gabaritos

**Classificação:** BLOQUEADOR  
**Documento/arquivo afetado:** `docs/v3/product-architecture.md`, `question-engine.md`, `data-model.md`, `ux-performance.md`, `implementation-roadmap.md`; `supabase/migrations/003_core_v2.sql`, `008_simulation_read_v2.sql`, `013_simulation_source_fidelity.sql`; `app/api/questions/route.ts`, `app/api/attempts/route.ts`.

**Problema:** `questions` guarda `statement`, `options`, `correct_option_index` e `explanation` na mesma relação; `question_versions` é proposta como snapshot dos mesmos campos. RLS atua por linha, não por coluna. Se o aluno ganhar `SELECT` sobre essa tabela para catálogo/prefetch, poderá consultar gabaritos de todo o pool sem responder. O fato de a UI omitir o campo não é controle de acesso.

**Impacto:** quebra de integridade pedagógica, simulados comprometidos e exposição em massa de gabaritos. O contrato seguro atual de `get_simulation_v2` seria contornado.

**Correção proposta:** separar fisicamente `question_answer_versions`/gabarito em schema server-only ou negar acesso à tabela base e expor uma view `security_invoker`/RPC DTO com allowlist de campos. Feedback é retornado somente pela operação atômica de resposta e gabarito de simulado somente após finalização. Testar consultas REST diretas, prefetch, source maps e payloads de erro. Nenhum cache deve receber a relação de respostas antes da tentativa.

**Precisa alterar o roadmap:** **sim**. Essa fronteira entra no modelo da Fase 0 e precede o conteúdo/engine da Fase 5.

### AR-05 — `service_role` continua como caminho comum e ignora RLS

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/product-architecture.md`, `multiuser-auth.md`, `migration-plan.md`, `implementation-roadmap.md`; `lib/server/supabaseRest.ts`, `lib/server/homeDataV2.ts`, todas as APIs privadas.

**Problema:** o helper único sempre usa `service_role`; RLS não bloqueará nem corrigirá uma consulta sem filtro. O roadmap fala em cliente caller-scoped, mas não determina a remoção estrutural do helper privilegiado de caminhos de aluno.

**Impacto:** qualquer `DEFAULT_USER_ID` esquecido ou filtro ausente pode ler/escrever outro usuário, mesmo com políticas perfeitas.

**Correção proposta:** separar módulos nominativamente: cliente de sessão/usuário, cliente editorial/admin e cliente de job. Bloquear importação do cliente privilegiado em `app/(student)/**` e handlers de aluno por lint/architecture test. Toda chamada administrativa deve autenticar a sessão primeiro e autorizar papel no servidor. Criar busca CI por `SUPABASE_SERVICE_ROLE_KEY`, `DEFAULT_USER_ID` e `p_user_id` fora da allowlist.

**Precisa alterar o roadmap:** **sim**. Tornar isso critério de aceite da Fase 2, não apenas cleanup da Fase 10.

### AR-06 — Versionamento do edital conflita com IDs e constraints V2

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/study-module.md`, `data-model.md`, `migration-plan.md`, `implementation-roadmap.md`; `supabase/migrations/003_core_v2.sql`, `016_simulation_current_edital_scope.sql`.

**Problema:** `syllabus_items` é hoje estável e único por disciplina/código; progresso, revisão, questão e simulado referenciam seu ID. Criar itens clonados por `syllabus_versions` fragmentaria progresso. Apenas adicionar versão pode colidir com a constraint atual. O simulado seleciona `si.active = true`, sem fixar a versão vigente no início da sessão.

**Impacto:** duplicação de tópicos, perda aparente de progresso, simulado que muda de escopo após publicação de novo edital e falha de migration ao alterar unicidade.

**Correção proposta:** separar conceito estável (`syllabus_items`) de participação/versionamento (`syllabus_version_items`, com ordem, título vigente e status). Backfill da versão V2 antes de tornar FKs obrigatórias. Simulados e sessões gravam `syllabus_version_id` imutável. Não clonar o conceito apenas para alterar vigência.

**Precisa alterar o roadmap:** **sim**. Definir o modelo na Fase 0 e executar expand/backfill antes de conteúdo na Fase 4.

### AR-07 — `question_versions` pode quebrar tentativas e simulados históricos

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/question-engine.md`, `data-model.md`, `migration-plan.md`, `implementation-roadmap.md`; tabelas V2 `questions`, `question_attempts`, `simulation_questions`, `error_notebook`.

**Problema:** os documentos exigem versão apresentada, mas não especificam como criar a versão-base de cada questão nem como ligar linhas históricas. Adicionar FK `NOT NULL` diretamente quebrará dados V2. Alterar gabarito também poderia recalcular incorretamente um simulado antigo.

**Impacto:** migrations falhas, perda de auditabilidade e resultados históricos mutáveis.

**Correção proposta:** expandir com `question_version_id` nulo; gerar exatamente uma versão-baseline por questão com hash e estado V2; backfill por lote; fazer novas sessões/attempts dual-write; validar zero nulos novos; só então aplicar FK/NOT NULL. `simulation_questions` deve capturar a versão e o gabarito efetivamente usado no fechamento, sem reavaliar pela versão corrente.

**Precisa alterar o roadmap:** **sim**. Incluir subfases e reconciliação na Fase 5 antes de qualquer contract.

### AR-08 — Simulados não alimentam o motor pedagógico atual

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/question-engine.md`, `data-model.md`, `migration-plan.md`, `implementation-roadmap.md`; migrations `006` e `007`; APIs de simulado.

**Problema:** responder/finalizar simulado atualiza `simulation_questions` e a nota, mas não insere `question_attempts` nem atualiza progresso, revisão e caderno de erros. Os documentos V3 tratam desempenho e recuperação como integração geral, sem decidir se respostas de simulado contam e em que momento.

**Impacto:** desempenho divergente da atividade real; ou, se uma integração for adicionada sem idempotência, dupla contagem em retries/finalizações.

**Correção proposta:** definir contrato: a resposta do simulado fica congelada durante `IN_PROGRESS`; uma finalização idempotente gera no máximo um attempt pedagógico por `simulation_question`, com `context = SIMULATION`, e aplica a mesma política canônica. Adicionar chave única `(simulation_id, question_version_id)` ou `attempt_id` na linha do simulado. Decidir explicitamente o peso de simulados em domínio/revisão.

**Precisa alterar o roadmap:** **sim**. A decisão pertence à Fase 5 e deve ser implementada/testada junto à Fase 7.

### AR-09 — Duas políticas de revisão já discordam

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/question-engine.md`, `data-model.md`, `implementation-roadmap.md`; `lib/services/reviewPolicyV2.ts`, `__tests__/review-policy-v2.test.ts`, `supabase/migrations/006_attempt_engine_v2.sql`.

**Problema:** o serviço/teste V2 mantém 24h enquanto a evidência é insuficiente e usa domínio/amostra para 7/30/60 dias. O RPC SQL usa progressão por estágio e pode avançar sem os mesmos gates. A V3 menciona versão de política, mas não define qual execução é canônica.

**Impacto:** agenda diferente conforme o caminho de resposta, regressão silenciosa das regras de evidência do `PRODUCT_V2.md` e dificuldade de reproduzir decisões.

**Correção proposta:** formalizar `ReviewPolicyV3` com entradas, saídas e `policy_version`; portar a mesma tabela de decisão para testes de contrato SQL/TypeScript ou centralizar em um único RPC; persistir a versão aplicada. Criar casos de paridade antes de migrar attempts.

**Precisa alterar o roadmap:** **sim**. Resolver na Fase 0/2 e torná-la dependência da Fase 5, não deixar apenas para a Fase 6.

### AR-10 — RLS, grants e autorização administrativa não têm matriz executável

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/multiuser-auth.md`, `data-model.md`, `migration-plan.md`, `implementation-roadmap.md`.

**Problema:** os textos acertam ao exigir RLS e grants juntos, mas não enumeram operação por tabela. Em projetos Supabase atuais, grant do Data API e policy RLS são controles distintos. `private.user_roles` também não pode ser lida diretamente pelo cliente; o fluxo de autorização server-side não está especificado. Em updates, uma policy incompleta pode falhar por ausência de `SELECT`/`WITH CHECK`.

**Impacto:** operações server-side caller-scoped bloqueadas, administração indisponível ou permissões excessivas. `service_role` continuaria funcionando e poderia mascarar o erro nos testes.

**Correção proposta:** anexar matriz tabela × `anon`/`authenticated`/admin backend × SELECT/INSERT/UPDATE/DELETE/EXECUTE; incluir grants, `USING`, `WITH CHECK`, política explícita de usuário não nulo e testes allow/deny. O helper `requireAdmin` deve validar sessão Auth e consultar `private.user_roles` com cliente privilegiado apenas no servidor, com auditoria.

**Precisa alterar o roadmap:** **sim**. Artefato obrigatório da Fase 0 e gate de toda migration exposta.

### AR-11 — Migração de rotas pode criar colisões e rollback falso

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/navigation.md`, `implementation-roadmap.md`; árvore atual `app/**`.

**Problema:** route groups não alteram URL. Criar `app/(student)/page.tsx` enquanto `app/page.tsx` existe gera duas páginas para `/`; o mesmo vale para rotas como `/estudar`. Uma feature flag não resolve colisão de arquivos no build.

**Impacto:** build quebrado e rollback por flag impossível justamente na fase de autenticação/shell.

**Correção proposta:** escolher um mecanismo: piloto real em `/v3/**`, ou refatorar uma única página por URL para delegar V2/V3 por flag. Só mover definitivamente arquivos depois do cutover. Documentar redirects, deep links, manifest/start URL e compatibilidade do service worker.

**Precisa alterar o roadmap:** **sim**. Detalhar estratégia na Fase 0 e corrigir arquivos afetados das Fases 1–3.

### AR-12 — Cache/persistência podem compartilhar dados autenticados

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/product-architecture.md`, `ux-performance.md`, `navigation.md`, `implementation-roadmap.md`; `public/sw.js`.

**Problema:** os documentos distinguem cache global/privado, mas não proíbem expressamente uma função `use cache` de capturar cliente/session ou retornar DTO misto. Também não há allowlist concreta para IndexedDB/local storage nem rotina de purge ao trocar usuário. O SW atual pode cachear qualquer resposta same-origin classificada como imagem, o que futuramente pode incluir asset protegido servido por proxy.

**Impacto:** usuário B visualiza snapshot, filtro, rascunho, fonte ou imagem de A no mesmo dispositivo; resposta privada pode ir para cache compartilhado.

**Correção proposta:** ADR com classificação de dados e testes: cache servidor compartilhado só recebe função pura com versão/ID público e DTO global; dados privados ficam `no-store` ou cache por request/usuário sem `use cache` compartilhado; storage local é namespaceado por `auth.uid + schema_version`, contém apenas IDs/posição/índice escolhido, nunca conteúdo/gabarito/token, e é apagado no logout/troca de conta. SW deve usar allowlist de paths estáticos, não apenas `request.destination`.

**Precisa alterar o roadmap:** **sim**. Tornar allowlist e teste A→logout→B critérios das Fases 1, 3 e 9.

### AR-13 — Consultas atuais não escalam e a V3 não fixa contratos de paginação

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/ux-performance.md`, `question-engine.md`, `implementation-roadmap.md`; `app/api/questions/route.ts`, `error-notebook/route.ts`, `performance/route.ts`, `reviews/route.ts`, `lib/server/homeDataV2.ts`.

**Problema:** `/api/questions` carrega até 2.000 questões e filtra/sorteia em memória; desempenho e home carregam até 5.000 attempts; caderno de erros lê todas as questões para juntar em JavaScript. A V3 cita cursor e batch, mas não define DTO, cursor estável, limites ou queries substitutas. Relações de fonte/conteúdo podem introduzir N+1 por item.

**Impacto:** latência, memória e egress crescentes por usuário; resultados truncados silenciosamente após 5.000; piora acentuada no mobile.

**Correção proposta:** definir endpoints/queries paginados por cursor composto estável (`created_at,id` ou equivalente), limite máximo e total separado quando necessário. Fazer joins/projeções no banco, agregação de desempenho incremental e seleção de pool no banco sem transferir o catálogo. Exigir planos `EXPLAIN (ANALYZE, BUFFERS)` com dados representativos e testes que detectem N+1.

**Precisa alterar o roadmap:** **sim**. Remover dependência de “otimizar só na Fase 9”; corrigir queries tocadas em cada fase e reservar agregados avançados para a Fase 9.

### AR-14 — Não existe harness atual para provar migrations e isolamento RLS

**Classificação:** ALTO  
**Documento/arquivo afetado:** `docs/v3/migration-plan.md`, `implementation-roadmap.md`; `__tests__/**`, `__tests__/helpers/testDb.ts`.

**Problema:** os testes existentes são unitários/estáticos e não executam Postgres, migrations, grants, RLS, RPCs ou Auth. O próprio helper declara não haver banco em memória. A suíte sequer inicia no checkout atual sem instalar dependências.

**Impacto:** os riscos mais graves da V3 não podem ser detectados pela suíte atual; uma UI verde não prova isolamento A/B nem rollback de schema.

**Correção proposta:** antes da Fase 1, restaurar baseline com dependências fixadas e criar `supabase/tests/**` contra Supabase local descartável: apply de todas as migrations desde zero, upgrade de fixture V2, anon/A/B/admin/service-role, grants, RPC ownership, resposta/gabarito e rollback/restore. Não usar mocks para testes de RLS.

**Precisa alterar o roadmap:** **sim**. Fase 0 só termina com Jest verde e harness SQL executável em CI.

### AR-15 — Favoritos e cadernos polimórficos não têm integridade definida

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/data-model.md`, `implementation-roadmap.md`.

**Problema:** `favorites`/`notebook_items` admitem diversos tipos de alvo, mas a Fase 6 deixa a escolha entre alvo polimórfico e tabelas específicas para depois. `target_type + target_id` não oferece FK normal para cada tabela.

**Impacto:** referências órfãs, validação espalhada e consultas/RLS complexas.

**Correção proposta:** para o primeiro release, usar tabelas de ligação tipadas para os alvos realmente necessários (`question_favorites`, `content_favorites`) e um notebook com itens tipados/FKs explícitas. Adiar registro genérico até haver caso de uso que justifique.

**Precisa alterar o roadmap:** **sim**. Fechar a decisão na Fase 0 ou reduzir o escopo da Fase 6.

### AR-16 — Gamificação e agregados estão complexos demais para o primeiro corte

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/data-model.md`, `product-architecture.md`, `implementation-roadmap.md`.

**Problema:** `goals`, `goal_progress`, `xp_events`, `user_xp`, `achievements`, `user_achievements`, `study_streaks`, `performance_daily` e possível outbox criam múltiplas fontes derivadas sem definir o evento canônico, reconstrução e consistência.

**Impacto:** dupla contagem, transações frágeis e custo operacional desproporcional ao valor inicial.

**Correção proposta:** manter eventos imutáveis/idempotentes como fonte; calcular saldo XP e progresso inicialmente por query/view limitada ou uma única projeção reconstruível. Só materializar streak/performance quando métricas mostrarem necessidade. XP nunca deve fazer uma tentativa falhar: core pedagógico + outbox são atômicos, projeção é assíncrona.

**Precisa alterar o roadmap:** **sim**. Simplificar a Fase 8 e tornar tabelas derivadas opcionais, com benchmark/gate.

### AR-17 — Checkpoints e sessões duplicam persistência de estado

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/navigation.md`, `data-model.md`, `ux-performance.md`, `implementation-roadmap.md`; tabelas `study_sessions`, `simulations`, `simulation_questions`.

**Problema:** `ui_checkpoints` é proposta “nova ou absorvida”, embora sessões e simulados já sejam proprietários naturais de posição/resposta. Um checkpoint genérico pode divergir do estado canônico e exigir RLS/purge/sincronização adicionais.

**Impacto:** retomada na posição errada, conflitos entre abas e mais uma tabela privada para proteger.

**Correção proposta:** URL para filtros navegáveis; `study_sessions`/`study_session_items` para treino; `simulations`/`simulation_questions` para prova; `user_preferences` apenas para preferências duráveis. Não criar `ui_checkpoints` genérica no primeiro corte. Usar revisão otimista/version number para concorrência entre abas.

**Precisa alterar o roadmap:** **sim**. Remover a migration genérica da Fase 3 e definir owners de estado.

### AR-18 — Política de cadastro e exposição do conteúdo não foi definida

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/navigation.md`, `multiuser-auth.md`, `product-architecture.md`, `implementation-roadmap.md`.

**Problema:** há `/cadastro`, confirmação e recuperação de senha, mas nenhuma decisão sobre signup aberto, convite, aprovação, bloqueio ou entitlement ao material publicado.

**Impacto:** abuso de cadastro, enumeração, custo de email e acesso não pretendido a conteúdo/fontes.

**Correção proposta:** começar invite-only/admin-approved, com mensagens anti-enumeração e rate limiting; separar “autenticado” de “ativo/autorizado”; documentar desativação, exclusão e retenção de dados. Se signup aberto for requisito posterior, aprová-lo como decisão de produto e ameaça.

**Precisa alterar o roadmap:** **sim**. Decisão e testes na Fase 0/1; ajustar `/cadastro` conforme o modo escolhido.

### AR-19 — Fontes oficiais não devem virar catálogo bruto de aluno

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/study-module.md`, `data-model.md`, `multiuser-auth.md`, `implementation-roadmap.md`; migrations `001`, `002`, `005`, `009`, `012`, `017`; APIs `app/api/sources/**`.

**Problema:** tabelas de fontes e candidatos são hoje backend-only. Vincular fonte oficial ao conteúdo não implica dar ao aluno SELECT em documentos brutos, caminhos de storage, extrações, hashes internos ou candidatos não publicados.

**Impacto:** exposição de material editorial, documentos em revisão e metadados internos; possível vazamento de URL assinada.

**Correção proposta:** manter ingestão/extração/candidatos server-only; publicar uma projeção mínima de citação (`título público`, órgão, data, página/trecho permitido, URL oficial quando pública) e assets aprovados com TTL curto. Toda promoção/publicação mantém trilha e regras de `PRODUCT_V2.md`.

**Precisa alterar o roadmap:** **sim**. Acrescentar fronteira editorial/publicada às Fases 4 e 10.

### AR-20 — Robustez de tentativa e resposta de simulado está incompleta

**Classificação:** MÉDIO  
**Documento/arquivo afetado:** `docs/v3/question-engine.md`, `migration-plan.md`, `implementation-roadmap.md`; migrations `006`, `007`; APIs de attempts/simulations.

**Problema:** `question_attempts` não possui chave de idempotência; retries podem duplicar progresso. O RPC de simulado permite atualizar novamente uma posição respondida enquanto o simulado está aberto. A validação aceita índices até 9 sem conferir o tamanho real de `options` no contrato de API.

**Impacto:** contagens, XP, caderno e revisão duplicados; alteração tardia de resposta sem regra explícita.

**Correção proposta:** adicionar `idempotency_key` nula no expand e unique parcial por usuário/contexto; validar opção contra a versão apresentada; decidir se resposta de simulado é imutável ou versionada até avançar e aplicar essa regra no banco, não só na UI; finalizar uma única vez com lock/estado esperado.

**Precisa alterar o roadmap:** **sim**. Critérios explícitos nas Fases 5 e 7.

### AR-21 — Baseline de runtime e instruções do repositório não está verificável

**Classificação:** BAIXO  
**Documento/arquivo afetado:** `AGENTS.md`, `docs/v3/implementation-roadmap.md`, `package.json`.

**Problema:** `AGENTS.md` exige consulta à documentação local da versão de Next.js antes de mudanças, mas `node_modules/next/dist/docs` não está disponível neste checkout. `package.json` usa `@types/node ^20` e não declara `engines`, enquanto o runtime atual suportado pelo ecossistema Supabase deve ser fixado e validado antes da implementação.

**Impacto:** decisões baseadas em documentação errada e diferenças entre CI/produção; não é risco de dados imediato porque ainda não houve implementação.

**Correção proposta:** Fase 0 instala dependências via lockfile, lê os tópicos locais relevantes do Next 16, registra Node suportado (22+ no ambiente de 2026), atualiza tipos quando autorizado e preserva o bloco gerenciado de `AGENTS.md`.

**Precisa alterar o roadmap:** **sim**. Acrescentar ao baseline técnico da Fase 0.

### AR-22 — Numeração e rollback das migrations legadas precisam de inventário real

**Classificação:** BAIXO  
**Documento/arquivo afetado:** `docs/v3/migration-plan.md`, `implementation-roadmap.md`; `supabase/migrations/014_answer_key_annulment.sql`, `014_prevent_annulled_real_questions.sql`.

**Problema:** existem duas migrations prefixadas `014`; o plano V3 usa nomes conceituais, mas não define convenção ordenável nem reconciliação com o histórico aplicado. Rollback é descrito principalmente como flag, embora DDL/backfill exija roll-forward e restore ensaiado.

**Impacto:** ordem diferente entre ambiente novo e banco existente, ou falsa expectativa de desfazer migration destrutiva com feature flag.

**Correção proposta:** inventariar a tabela de histórico de migrations em cada ambiente, congelar checksums das V2, adotar timestamps únicos para V3 e fornecer para cada fase script de verificação, roll-forward corretivo e restore point. Nunca renomear retroativamente arquivos já aplicados sem estratégia de repair documentada.

**Precisa alterar o roadmap:** **sim**. Gate da Fase 0 e campo de rollback de todas as fases de banco.

## Estratégia obrigatória para tabelas sem `user_id`

Nem toda tabela sem `user_id` é defeito. A estratégia correta é por categoria:

| Categoria/tabelas atuais | Estratégia V3 |
|---|---|
| `app_users` | adicionar `auth_user_id` como ponte expand/contract; não adicionar um segundo `user_id` |
| `simulation_questions` | manter propriedade pelo FK `simulation_id → simulations.user_id`; políticas/queries validam o pai |
| `disciplines`, `syllabus_items`, `exams`, `questions`, `exam_incidence` | manter globais; acrescentar vigência/publicação/versão, não propriedade de aluno |
| `source_documents`, `source_relationships`, `question_sources`, extrações, candidatos e assets | manter editoriais/admin; adicionar `created_by`/`reviewed_by` quando necessário para auditoria, não `user_id` de isolamento |
| novas tabelas privadas | `user_id`/owner obrigatório desde a criação, derivado da sessão, com FK, índice, grants e RLS na mesma migration |

As tabelas privadas V2 que já têm `user_id` precisam de ponte/backfill, não de uma nova coluna adicionada cegamente. `simulation_questions` não deve duplicar o proprietário: se excepcionalmente houver coluna denormalizada, uma constraint/trigger deve garantir igualdade com o pai, o que não se justifica no primeiro corte.

## Alterações mínimas exigidas no roadmap

Antes de implementação, `implementation-roadmap.md` deve incorporar estes gates:

1. **Fase 0:** fechar ADRs de identidade, dual-auth, fronteira de gabarito, edital estável/versionado, política de revisão, mutações HTTP, cache/storage e admissão de usuários; recuperar baseline Jest; criar harness SQL; inventariar migrations aplicadas.
2. **Fase 1:** Auth isolado do legado, preferencialmente piloto `/v3`; criar ponte `app_users.auth_user_id`; não liberar novos usuários às APIs V2; matriz de cookies/rotas.
3. **Fase 2:** separar clientes caller/admin; novos RPCs seguros sem `p_user_id`; matriz grants/RLS completa; testes A/B; proibir `service_role` em fluxo de aluno.
4. **Fase 3:** não criar `ui_checkpoints` genérica; persistir estado no agregado dono e testar troca de conta/purge.
5. **Fase 4:** modelar conceito de edital separado da vigência e publicar apenas projeção segura de fontes.
6. **Fase 5:** separar gabarito, backfill de `question_versions`, idempotência, política canônica e paginação desde a primeira query.
7. **Fase 6:** escolher tabelas tipadas de favoritos/cadernos e aplicar política de revisão já decidida.
8. **Fase 7:** congelar versão/edital por simulado e integrar attempts de modo idempotente, preservando ocultação de gabarito.
9. **Fase 8:** reduzir materializações; core pedagógico não depende de XP.
10. **Fase 9:** agregados reconstruíveis e cache isolado, sem adiar correções óbvias de N+1/limites das fases anteriores.
11. **Fase 10:** contract somente após duas releases estáveis, zero referência legada, restore drill e auditoria de contagens.

Cada fase continua obrigada a informar objetivo, arquivos afetados, tabelas/migrations, dependências, risco, testes, rollback e critério de aceite; após esta revisão, “rollback por flag” sozinho não é suficiente para uma fase que altera dados.

## Condições para mudar a decisão

A decisão pode passar para **APROVADO COM CORREÇÕES** quando AR-01 a AR-04 estiverem resolvidos de forma inequívoca nos nove documentos e AR-05, AR-06, AR-07, AR-09, AR-10, AR-11 e AR-14 tiverem gates anteriores à primeira migration de dados privados. Pode passar para **APROVADO PARA IMPLEMENTAÇÃO** quando, adicionalmente, o baseline V2 estiver verde, o harness SQL aplicar o upgrade de uma fixture V2 sem perda e os testes A/B provarem que aluno, cache, RPC e gabarito permanecem isolados.

Até lá, a ação segura é revisar a especificação — não executar código ou migrations.
