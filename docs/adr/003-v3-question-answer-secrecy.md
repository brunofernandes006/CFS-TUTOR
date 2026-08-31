# ADR 003 — Fronteira de questão e sigilo do gabarito

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026

## Decisão

Enunciado e correção são superfícies de segurança diferentes. A role `authenticated` nunca recebe `SELECT` sobre tabela/relação que contenha alternativa correta, gabarito, explicação pós-resposta, rubrica ou campo equivalente.

### Modelo

- `questions`: identidade global e metadados administrativos não secretos.
- `question_versions`: enunciado, contexto, opções, assets aprovados, status e hash editorial; não contém resposta.
- `private.question_answer_versions`: `question_version_id`, estado do gabarito (`VALID | ANNULLED | PENDING`), alternativa correta quando aplicável, explicação, fonte do gabarito, verificador e hash. Schema não exposto e sem grants a `anon`/`authenticated`.
- Tabelas/candidatos editoriais permanecem server-only.

### DTO público

`PublicQuestionDTO` contém somente:

- `sessionItemId`, `questionId`, `questionVersionId`, posição;
- disciplina/item, origem/label, ano/banca/número e citação permitida;
- contexto, enunciado, opções e assets já autorizados;
- flags `annulmentPolicy`, `requiresVisual`, `canSubmit`;
- estado do item do usuário (`UNANSWERED | ANSWERED`), sem indicar acerto antes da política permitir.

Não contém `correct*`, `answer*`, `key*`, explicação, hash do gabarito nem campos derivados que revelem a resposta.

### Submissão e resposta

`POST /api/v3/question-sessions/{sessionId}/items/{itemId}/submit` é o contrato HTTP estável para treino/revisão. Recebe `chosenOptionIndex`, `idempotencyKey` e `expectedSessionVersion`; não recebe user ID, question ID livre ou resposta correta.

A Route Handler valida sessão Auth e chama a RPC atômica de aluno. Em sucesso de modo com feedback imediato, retorna `QuestionFeedbackDTO`:

- `attemptId`, `outcome` (`CORRECT | INCORRECT | ANNULLED`);
- `correctOptionIndex` apenas após submissão válida e apenas se não anulada;
- explicação pós-resposta e citação oficial permitida;
- atualização de revisão/erro e nova versão da sessão.

Retry com a mesma chave retorna o mesmo DTO; payload diferente com a mesma chave retorna conflito.

### Anuladas

- `ANNULLED` não possui alternativa correta.
- Pode ser exibida em prova histórica com rótulo explícito.
- Submissão produz `outcome = ANNULLED`, não gera acerto/erro, domínio, revisão causal, caderno de erros ou XP de correção.
- Não entra em treino/simulado oficial corrente salvo política explícita de composição histórica.

### Simulados

- Durante `IN_PROGRESS`, DTO não contém resultado, explicação ou gabarito, inclusive de itens já respondidos.
- Respostas são persistidas idempotentemente e ficam congeladas conforme regra do simulado.
- Finalização única, transacional, captura a versão e o gabarito usado, calcula nota e só então libera `SimulationResultDTO`.
- Acesso direto ao resultado exige propriedade e status `COMPLETED`.
- Prefetch usa exatamente `PublicQuestionDTO`, nunca tabela base ou DTO administrativo.

### Proteção direta

- `anon` e `authenticated`: revoke all em `private.question_answer_versions`, tabelas base administrativas e RPCs de correção internas.
- O cliente lê apenas view API `security_invoker` sem colunas secretas ou recebe DTO de Route Handler/RPC invoker.
- CI inspeciona catálogo de grants e executa tentativas REST/GraphQL/RPC de ler campos proibidos.
- Logs, erros, telemetry, source maps e respostas 4xx/5xx não incluem resposta correta.

## Consequências

Há uma junção server-side adicional durante correção, mas o gabarito não pode ser descoberto por inspeção de rede ou Data API antes da hora pedagógica correta.

