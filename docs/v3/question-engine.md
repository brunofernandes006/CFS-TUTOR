# CFS Tutor V3 — motor de questões

## Objetivo

Oferecer treino, recuperação, provas anteriores e simulados com filtros avançados, rastreabilidade integral e progresso individual. A mesma questão pode participar de diferentes sessões, mas sua validade e origem nunca mudam conforme o contexto.

## Tipos de sessão

| Tipo | Seleção | Feedback | Uso de desempenho |
|---|---|---|---|
| treino livre | filtros do aluno | imediato após confirmar | sim |
| questões relacionadas | item/unidade estudada | imediato | sim |
| recuperação | revisão ou erro | após tentativa | sim, com contexto de revisão |
| caderno | itens escolhidos pelo usuário | configurável | sim |
| prova anterior | composição histórica | somente conforme modo escolhido | separado do escopo corrente quando necessário |
| simulado oficial | distribuição vigente | somente ao finalizar | sim |
| simulado adaptativo | lacunas individuais | somente ao finalizar ou por configuração | sim |

Na V3 inicial, todo modo de simulado retém feedback até finalizar. Uma mudança futura de modo exige novo contrato e não pode reutilizar payload de treino.

## Filtros avançados

### Essenciais

- disciplina;
- item do edital e descendentes;
- quantidade;
- status: todas, não resolvidas, corretas, erradas;
- origem: real, interna validada;
- dificuldade;
- ordenação: prioridade, edital, recência, aleatória reproduzível.

### Avançados

- prova/ano;
- somente edital vigente;
- revisões vencidas;
- reincidência de erro;
- favoritas;
- caderno;
- com fonte visual disponível;
- intervalo de última tentativa;
- excluir vistas recentemente;
- tipo de alternativa, quando aplicável.

Filtros incompatíveis são desabilitados com explicação. Consultas são versionadas, validadas no servidor e podem ser salvas por usuário.

## Seleção de questões

O motor retorna uma sessão materializada, não uma query recalculada a cada navegação. Cada item registra posição, versão da questão e contexto de seleção.

Regras:

- questão real somente validada e com gabarito oficial;
- questão anulada entra apenas em experiências que tratem anulação explicitamente;
- questão histórica fora do edital atual é excluída por padrão;
- visual obrigatório precisa estar disponível;
- evitar duplicação e exposição repetida recente;
- seed persistida torna a ordem reproduzível;
- adaptativo registra motivos da seleção.

## Questões relacionadas

Relações podem ser:

- questão → item do edital;
- questão → unidade/bloco de conteúdo;
- questão → questão semelhante, pré-requisito ou contraste;

Relação automática é candidata. Publicação exige validação administrativa para vínculos que impactem conteúdo oficial ou domínio.

## Ciclo de resposta

```text
READY → SELECTED → SUBMITTING → CONFIRMED → FEEDBACK
                       └──────→ RETRYABLE_ERROR
```

- Selecionar alternativa é otimista e local.
- Confirmar gera comando HTTP/RPC idempotente, sem `user_id` no payload.
- Tentativa, progresso, revisão e erro são processados atomicamente; a mesma transação grava outbox. Meta/XP/desempenho são projeções idempotentes e não bloqueiam a tentativa.
- Feedback só aparece após confirmação do servidor.
- Erro pede classificação causal rápida, editável depois.

## Fronteira de dados e gabarito

O browser nunca consulta a tabela base de correção. `question_versions` contém apenas apresentação; `private.question_answer_versions` contém gabarito/explicação e não tem grants para `anon`/`authenticated`.

### `PublicQuestionDTO`

```text
sessionItemId, questionId, questionVersionId, position,
discipline, syllabusItem, originLabel, examCitation,
contextText, statement, options, authorizedAssets,
requiresVisual, annulmentPolicy, canSubmit, userItemState
```

São proibidos no DTO, inclusive sob nomes derivados: `correct_answer`, `correctOptionIndex`, gabarito, explicação pós-resposta, rubrica, hash ou score que revele a alternativa. Prefetch e primeira leitura usam exatamente esse contrato.

### Submissão

`POST /api/v3/question-sessions/{sessionId}/items/{itemId}/submit`

Entrada: `chosenOptionIndex`, UUID `idempotencyKey` e `expectedSessionVersion`. O servidor deriva `auth.uid()`, verifica que a sessão/item pertencem ao ator, valida opção contra as opções daquela versão e chama a RPC atômica. Cliente não envia `questionId`, versão ou owner livres como autoridade.

Para treino/revisão, sucesso retorna `QuestionFeedbackDTO` com attempt, outcome, resposta correta e explicação **somente depois** da submissão válida. Retry idêntico retorna o mesmo DTO; mesma chave com payload diferente retorna `409`. Ausência de sessão retorna `401`; recurso alheio retorna `404` sem confirmar existência.

### Questão anulada

- não possui alternativa correta;
- em prova histórica é apresentada com rótulo explícito;
- submissão retorna `outcome = ANNULLED`, sem revelar resposta fabricada;
- não altera domínio, revisão, caderno de erros ou XP de correção;
- não entra no treino/simulado oficial corrente salvo regra histórica explícita.

Views expostas são `security_invoker` e não fazem join com a tabela privada de resposta. `anon` não recebe grants. Testes tentam leitura direta por REST/GraphQL/view/RPC, inspecionam prefetch, erros e logs. Contrato normativo: [ADR 003](../adr/003-v3-question-answer-secrecy.md).

## Ferramentas durante a resolução

- eliminar alternativas localmente;
- ajustar fonte e modo foco;
- favoritar;
- adicionar a caderno;
- ver fonte e contexto permitido;
- reportar erro de conteúdo;
- navegar anterior/próxima;
- abrir cartão de questões;
- pausar/retomar quando o modo permitir.

Anotações privadas podem ser acrescentadas numa fase posterior dentro de cadernos; não fazem parte da questão global.

## Provas anteriores

- prova e gabarito formam um par validado;
- preservar ano, banca, número, disciplina, página, anulação e assets;
- oferecer modo aplicação e modo estudo;
- mostrar compatibilidade com edital vigente por questão/item;
- resultados históricos fora do escopo não contaminam prontidão corrente sem regra explícita;
- permitir gerar caderno ou sessão apenas com questões compatíveis.

## Simulados

### Oficial

Mantém distribuição, pesos, mínimos e composição vigentes. Pool insuficiente bloqueia criação com diagnóstico por disciplina.

### Adaptativo

Combina domínio, erros, revisão, incidência confiável e cobertura. Quantidade configurável dentro de limites. O resultado explica por que áreas foram selecionadas sem expor dados de outros usuários.

### Aplicação

- checkpoint remoto e local mínimo;
- cartão de respostas mobile;
- timer e regra de pausa;
- respostas confirmadas individualmente;
- conclusão idempotente;
- nenhuma correção durante modo prova;
- resultado por disciplina/item e fila de recuperação.

Ao criar, o simulado fixa `syllabus_version_id`, seed e `question_version_id` de cada item. Enquanto `IN_PROGRESS`, inclusive após salvar uma resposta, nenhum DTO contém acerto, alternativa correta ou explicação. Resposta confirmada é imutável; se um modo permitir troca, ela exige comando explícito versionado antes de avançar. Finalização usa lock/estado esperado, é executada uma vez e libera `SimulationResultDTO` somente ao proprietário.

Cada item finalizado gera no máximo um `question_attempt` com `context = SIMULATION` e ligação única. O simulado oficial influencia desempenho e fila de recuperação pela mesma `ReviewPolicyV3`, sem dupla contagem. Attempts anulados/inválidos não alimentam domínio/erro.

## Favoritos e cadernos

- Favorito é relação única usuário–alvo e pode apontar para questão ou conteúdo.
- Caderno é coleção nomeada, privada, ordenável, com descrição e itens heterogêneos controlados.
- Adicionar/remover favorito pode usar optimistic UI com rollback.
- Operação de caderno usa versão para evitar perda em múltiplas abas/dispositivos.

## Integridade

- attempts guardam snapshot mínimo de versão/gabarito necessário à auditoria;
- edição de questão publicada cria versão, não reescreve silenciosamente o passado;
- métricas ignoram tentativas inválidas, anuladas ou de conteúdo não elegível conforme regra documentada;
- reportes podem suspender uma questão de novas sessões sem apagar histórico;
- toda mutação usa `auth.uid()` derivado da sessão.
- nenhuma RPC de aluno aceita `p_user_id`; propriedade é verificada na mesma transação;
- `idempotency_key` é única por usuário/contexto e o payload é associado por hash;
- `ReviewPolicyV3` versionada é a única fonte para 24h/7d/30d/60d e preserva evidência insuficiente em 24h;
- caderno de erros é atualizado idempotentemente apenas por erro elegível; causa permanece editável e auditada;
- facts históricos usam `question_version_id` e gabarito capturado, nunca a versão corrente.

## Consultas, paginação e N+1

- criação de sessão seleciona o pool no banco, com filtros/eligibilidade aplicados antes do limite; não transfere 2.000 questões para sorteio em memória;
- listas e históricos usam cursor opaco estável (`sort_value,id`), padrão 25 e máximo 100; offset fica restrito a catálogos pequenos e estáticos;
- erro, revisão, fonte pública e item são enriquecidos por query/view batch, sem fetch por linha nem download do catálogo inteiro;
- contagens são endpoints/agregações próprias e nunca inferidas de página truncada;
- toda query crítica tem índice, orçamento, fixture representativa e `EXPLAIN (ANALYZE, BUFFERS)` no staging.
