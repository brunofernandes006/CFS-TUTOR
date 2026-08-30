# CFS Tutor V3 — modelo de dados

## Convenções

- UUID para entidades de domínio e identidade.
- `created_at`, `updated_at` e, quando necessário, `deleted_at`.
- Dados globais de conteúdo separados dos dados privados por usuário.
- Estados com constraints ou enums documentados.
- Histórico auditável por versão/evento, sem apagar fatos pedagógicos.
- `user_id` referencia `auth.users(id)` diretamente ou `profiles(id)`, conforme decisão de migration.
- RLS habilitado e grants mínimos em toda tabela exposta.

## Identidade

### `profiles` — nova

PK/FK `id → auth.users.id`, nome, timezone, locale, status e timestamps. RLS: proprietário lê/atualiza campos permitidos; admin via backend.

### `user_preferences` — nova

Uma linha por usuário: tamanho de fonte, modo de confirmação, preferências de timer, notificações e esquema versionado. RLS proprietário.

### `private.user_roles` — nova, schema não exposto

Usuário, papel, concedido por, data e revogação. Acesso somente servidor autorizado.

### `app_users` — legado

Será absorvida por `profiles` ou transformada em compatibilidade temporária. `access_key_hash` é removido somente após cutover validado.

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

Representa cada edital/versão e sua vigência. `syllabus_items` passa a apontar para versão explícita; escopo corrente não depende apenas de `active`.

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

Snapshot editorial de enunciado, opções, gabarito, explicação, assets e status. Tentativas apontam para a versão apresentada.

### `question_reports` — nova

Usuário, questão/versão, categoria, descrição, status, atribuição e resolução. RLS: usuário cria/lê próprio; admin gerencia via backend.

## Sessões e progresso individual

### `study_sessions` — evoluir

Adicionar tipo, item/conteúdo alvo, status, checkpoint, versão, última atividade e idempotency key.

### `study_session_items` — nova

Fila materializada de conteúdo, prompts ou questões; posição, estado, resposta/checkpoint e timestamps.

### `question_attempts` — evoluir

Usar `auth.uid`, apontar para versão da questão, sessão e contexto; incluir idempotency key e elegibilidade pedagógica.

### `topic_progress` — evoluir

Agregado por usuário/item/versão do edital: leitura, prática, evidência, domínio, erro e última atividade. Recalculável a partir de eventos.

### `review_schedule` — evoluir

Agenda por usuário/item, estágio, política/versionamento, próxima revisão e origem do agendamento.

### `error_notebook` — evoluir

Usuário/questão/item, causa, contagem, lacuna, estado, última ocorrência e resolução. Histórico de classificações pode ir para tabela de eventos.

### `ui_checkpoints` — nova ou absorvida em sessões

Estado remoto mínimo: rota/entidade, posição, versão e timestamp. Não armazena conteúdo completo.

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

Usuário Auth, política/versão, seed, checkpoint, tempo, status e idempotency key.

### `performance_daily` — nova, agregado

Usuário/data/item/disciplina: tentativas elegíveis, acertos, tempo e revisões. Ajuda consultas de 7/30/90 dias.

Agregados nunca substituem eventos; jobs podem reconstruí-los.

## Mapa de propriedade e RLS

| Classe | Exemplos | Leitura aluno | Escrita aluno |
|---|---|---|---|
| catálogo publicado | disciplinas, edital, conteúdo, questões, provas | autenticado e elegível | nenhuma direta |
| privado individual | progresso, tentativas, revisões, erros, metas, XP | somente proprietário | proprietário por política/RPC |
| coleção privada | favoritos, cadernos, filtros | somente proprietário | proprietário |
| administrativo | candidatos, auditoria, papéis | nenhuma | nenhuma |
| storage privado | fontes e assets | URL assinada autorizada | admin/backend |

## Índices mínimos previstos

- todas as FKs usadas em joins;
- `(user_id, updated_at desc)` nas entidades privadas;
- `(user_id, status, next_review_at)` em revisões;
- `(user_id, syllabus_item_id, answered_at desc)` em tentativas;
- `(syllabus_version_id, discipline_id, edital_order)` no currículo;
- GIN somente para filtros JSONB realmente consultados;
- índices parciais para publicado/ativo e sessões em andamento;
- unique para idempotency keys por usuário/escopo.

## Integridade transacional

Registrar tentativa deve validar versão/gabarito, inserir attempt, atualizar progresso/revisão/erro e emitir XP/meta de forma atômica ou por outbox idempotente. Nunca aceitar `user_id` informado pelo cliente quando a sessão fornece `auth.uid()`.

