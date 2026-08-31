# CFS Tutor V3 — modelo de dados

## Convenções

- UUID para entidades de domínio e identidade.
- `created_at`, `updated_at` e, quando necessário, `deleted_at`.
- Dados globais de conteúdo separados dos dados privados por usuário.
- Estados com constraints ou enums documentados.
- Histórico auditável por versão/evento, sem apagar fatos pedagógicos.
- Tabelas V3 privadas usam `user_id → auth.users(id)`; como `profiles.id` é o mesmo UUID, joins de perfil não mudam a autoridade.
- Tabelas V2 mantêm `user_id → app_users(id)` durante expand/contract e são resolvidas pela ponte Auth; nenhuma FK é reescrita em big bang.
- RLS habilitado e grants mínimos em toda tabela exposta.

## Identidade

### `profiles` — nova

PK/FK `id → auth.users.id`, nome, timezone, locale, status e timestamps. RLS: proprietário lê/atualiza campos permitidos; admin via backend.

### `user_preferences` — nova

Uma linha por usuário: tamanho de fonte, modo de confirmação, preferências de timer, notificações e esquema versionado. RLS proprietário.

### `private.user_roles` — nova, schema não exposto

Usuário, papel, concedido por, data e revogação. Acesso somente servidor autorizado.

### `app_users` — legado

Durante coexistência é a ponte de domínio V2 e recebe `auth_user_id uuid null unique`. O proprietário mantém o ID legado; cada usuário Auth novo recebe linha de compatibilidade com `id = auth_user_id` e `access_key_hash = null`, enquanto FKs V2 existirem. Deixa de ser fonte de autenticação no cutover. Só é removida no contract quando zero FK depender dela; caso contrário fica read-only até o último contract. `access_key_hash` deixa de ser lido no cutover e é removido após duas releases e 14 dias estáveis.

### `private.legacy_user_auth_map` — temporária e auditável

Relação única `legacy_user_id → auth_user_id`, estado `PENDING/VERIFIED/CUTOVER/RETIRED`, lote, timestamps e contagens/checksums. Sem grants ao cliente. Permanece além do primeiro contract para auditoria e rollback; detalhes no [ADR 001](../adr/001-v3-identity-and-auth-cutover.md).

## Currículo, fontes e conteúdo global

### Existentes a preservar/evoluir

- `disciplines`
- `syllabus_items`
- `source_documents`
- `source_relationships`
- `source_extractions`
- `source_document_pages`
- `source_visual_assets`
- `exams`
- `question_sources`

### `syllabus_versions` — nova

Representa cada edital/versão e sua vigência. Não clona tópicos nem recebe progresso.

### `syllabus_version_items` — nova

Associação do conceito estável `syllabus_items` a `syllabus_versions`, com título/código exibido, ordem, estado e metadados de escopo daquela versão. Unique `(syllabus_version_id, syllabus_item_id)`. Sessão/simulado fixa `syllabus_version_id`; o escopo corrente não depende de `active`.

### `study_contents` — nova

Unidade editorial ligada ao item, natureza, status, versão, objetivo, estimativa, autoria e publicação.

### `study_content_blocks` — nova

Blocos ordenados com tipo e payload JSONB validado por schema da aplicação. Não aceita HTML arbitrário sem sanitização.

### `content_source_links` — nova

Conteúdo/bloco ↔ fonte, tipo da relação, página/seção, vigência, verificador e timestamps.

### `active_recall_prompts` — nova

Prompt próprio, tipo, rubrica, ordem, status e vínculo com conteúdo/item.

### `content_question_links` — nova

Conteúdo/bloco ↔ questão, relação, relevância e estado de validação.

### `question_relations` — nova

Questão ↔ questão com tipo, direção, score e validação.

### `content_audit_log` — nova

Ações administrativas, entidade, versão anterior/nova, ator e motivo. Payload minimizado.

## Questões e provas

### Existentes a preservar/evoluir

- `questions`
- `question_candidates`
- `answer_key_candidates`
- `simulation_questions`

### `question_versions` — nova

Snapshot apresentável de contexto, enunciado, opções, assets autorizados, status e hash editorial. **Não contém gabarito, alternativa correta nem explicação pós-resposta.** Tentativas apontam para a versão apresentada.

### `private.question_answer_versions` — nova, schema não exposto

Uma linha por `question_version_id`: estado `VALID/ANNULLED/PENDING`, alternativa correta somente em `VALID`, explicação pós-resposta, referência ao gabarito oficial, verificador, hash e auditoria. `anon` e `authenticated` não têm USAGE/SELECT; acesso ocorre apenas na correção RPC interna ou no backend administrativo.

### `api.published_question_versions` — view segura

View `security_invoker`/projeção da Data API com somente campos de `PublicQuestionDTO`. Não faz join com `private.question_answer_versions`. Se o schema `api` não for exposto, o mesmo DTO é produzido exclusivamente pelo Route Handler.

### `question_reports` — nova

Usuário, questão/versão, categoria, descrição, status, atribuição e resolução. RLS: usuário cria/lê próprio; admin gerencia via backend.

## Sessões e progresso individual

### `study_sessions` — evoluir

Adicionar tipo, item/conteúdo alvo, `syllabus_version_id`, status, checkpoint, versão otimista, última atividade e idempotency key.

### `study_session_items` — nova

Fila materializada de conteúdo, prompts ou questões; posição, estado, resposta/checkpoint e timestamps.

### `question_attempts` — evoluir

Preservar `user_id → app_users` durante expand e adicionar `auth_user_id` sombra. O proprietário é backfilled; novas tentativas escrevem ambos na mesma transação, sendo Auth a policy owner. Adicionar `question_version_id` inicialmente nulo, sessão/item, contexto, `idempotency_key`, elegibilidade, `review_policy_version`, entradas/resultados da política e outcome. Backfill cria baseline antes de NOT NULL. Unique parcial por Auth/contexto/idempotency key.

### `topic_progress` — evoluir

Agregado por usuário/item/versão do edital: leitura, prática, evidência, domínio, erro e última atividade. Recalculável a partir de eventos.

### `review_schedule` — evoluir

Agenda por usuário/item, estágio, política/versionamento, próxima revisão e origem do agendamento.

### `error_notebook` — evoluir

Usuário/questão/versão/item, causa, contagem, lacuna, estado, última ocorrência e resolução. Tentativa incorreta elegível cria/reabre de modo idempotente; anulada/inválida não cria erro. Alterações de causa geram eventos auditáveis; histórico não é apagado.

### Checkpoints — absorvidos, sem tabela genérica

`study_sessions`, `study_session_items`, `simulations` e `simulation_questions` são os donos do estado remoto. URL guarda filtros navegáveis; `user_preferences` guarda somente preferências. Não será criada `ui_checkpoints` na V3 inicial.

## Coleções

### `favorites` — nova

Usuário, tipo de alvo, alvo normalizado e timestamps; unique por usuário/alvo.

### `notebooks` — nova

Usuário, nome, descrição, cor semântica opcional, visibilidade privada e versão.

### `notebook_items` — nova

Caderno, tipo/alvo, posição, nota privada e timestamps. Unique conforme regra de duplicação.

### `saved_filters` — nova

Usuário, escopo, nome, versão do schema e consulta JSONB validada.

## Metas e gamificação

### `goals` — nova

Usuário, tipo, alvo, período, valor, status e timezone. Exemplos: minutos ativos, sessões concluídas, revisões em dia e cobertura.

### `goal_progress` — nova ou view/agregado

Progresso diário/por período derivado de eventos elegíveis.

### `xp_events` — nova, append-only

Usuário, regra/versionamento, pontos, entidade de origem, idempotency key e timestamp. XP nunca é atualizado por saldo direto.

### `user_xp` — nova, agregado

Saldo, nível e versão; recalculável do ledger.

### `achievements` — nova, catálogo global

Código, regra, versão, texto próprio, status e pontos opcionais.

### `user_achievements` — nova

Usuário, conquista, data e evento que a concedeu. Unique por regra.

### `study_streaks` — nova ou agregado

Dias elegíveis, janela/tolerância, última data e timezone. Não depende de simples login.

## Simulados e desempenho

### `simulations` — evoluir

Owner Auth/legado pela fase, `syllabus_version_id`, política/versão, seed, checkpoint, tempo, status, versão otimista e idempotency key. A versão do edital não muda após criação.

### `simulation_questions` — evoluir

Mantém owner indireto por `simulation_id`; não ganha `user_id`. Adicionar `question_version_id`, resposta/versão de resposta, estado congelado, resultado após conclusão e `attempt_id` único/nulo. Finalização cria no máximo um attempt por item e não recalcula pelo gabarito corrente.

### `performance_daily` — nova, agregado

Usuário/data/item/disciplina: tentativas elegíveis, acertos, tempo e revisões. Ajuda consultas de 7/30/90 dias.

Agregados nunca substituem eventos; jobs podem reconstruí-los.

## Mapa de propriedade e RLS

| Classe | Exemplos | Leitura aluno | Escrita aluno |
|---|---|---|---|
| catálogo publicado | disciplinas, edital, conteúdo, questões, provas | autenticado e elegível | nenhuma direta |
| correção/gabarito | `private.question_answer_versions` | nenhuma | nenhuma |
| privado individual | progresso, tentativas, revisões, erros, metas, XP | somente proprietário | proprietário por política/RPC |
| coleção privada | favoritos, cadernos, filtros | somente proprietário | proprietário |
| administrativo | candidatos, auditoria, papéis | nenhuma | nenhuma |
| storage privado | fontes e assets | URL assinada autorizada | admin/backend |

## Índices mínimos previstos

- todas as FKs usadas em joins;
- `(user_id, updated_at desc)` nas entidades privadas;
- `(user_id, status, next_review_at)` em revisões;
- `(user_id, syllabus_item_id, answered_at desc)` em tentativas;
- `(user_id, answered_at desc, id desc)` para cursor de histórico;
- `(user_id, status, updated_at desc, id desc)` para caderno/sessões;
- `(syllabus_version_id, discipline_id, edital_order)` no currículo;
- `(syllabus_version_id, syllabus_item_id)` unique em associações;
- `(simulation_id, position)` e `(simulation_id, question_version_id)` em simulados;
- GIN somente para filtros JSONB realmente consultados;
- índices parciais para publicado/ativo e sessões em andamento;
- unique para idempotency keys por usuário/escopo.

## Integridade transacional

Registrar tentativa valida sessão/propriedade/versão/opção/elegibilidade, reserva idempotência, insere attempt e atualiza progresso, revisão e erro **na mesma transação**. A transação também grava um evento outbox único. XP, metas e agregados são projeções assíncronas/reconstruíveis; falha nelas não desfaz a tentativa. Nunca aceitar `user_id` informado pelo cliente quando a sessão fornece `auth.uid()`.

`ReviewPolicyV3` é a fonte canônica e versionada para 24h/7d/30d/60d. O RPC V2 divergente não é reutilizado como política. Simulados criam attempts apenas na finalização idempotente, exatamente uma vez por item. Ver [ADR 006](../adr/006-v3-attempt-review-simulation-consistency.md).

## Backfill sem quebra da V2

1. criar edição V2 em `syllabus_versions` e associações para itens existentes;
2. criar uma versão-baseline e uma resposta privada para cada questão;
3. adicionar FKs V3 nulas, preencher em lotes reexecutáveis e dual-write somente para novas linhas;
4. reconciliar contagens/hashes, versões órfãs e resultados de simulados;
5. aplicar NOT NULL/constraints apenas depois de zero divergência;
6. nunca recalcular attempt/simulado histórico a partir da versão atual.

## Contratos de consulta

- Históricos e caderno usam cursor opaco baseado em ordenação estável, limite padrão 25 e máximo 100.
- A primeira página inclui `nextCursor`; total exato só é calculado quando houver query dedicada barata.
- Enriquecimento de erro/revisão/questão é feito por join/projeção no banco, não carregando catálogos completos para juntar em memória.
- Home/desempenho usam agregações/queries limitadas desde a primeira fase; nunca truncam silenciosamente attempts em 5.000.
