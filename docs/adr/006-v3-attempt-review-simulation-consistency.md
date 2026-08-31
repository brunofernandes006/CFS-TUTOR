# ADR 006 — Consistência entre tentativa, revisão, erro e simulado

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026

## Decisão

### Transação pedagógica

Uma submissão válida executa na mesma transação:

1. valida sessão, propriedade, versão, opção e elegibilidade;
2. reserva `idempotency_key` única por usuário/contexto;
3. grava `question_attempt` imutável;
4. aplica a política canônica de progresso, revisão e caderno de erros;
5. grava um evento de outbox idempotente.

XP, metas, streak e agregados de desempenho são projeções reconstruíveis do outbox; falha de projeção não desfaz a tentativa.

### Política de revisão

`ReviewPolicyV3` é a única tabela de decisão, versionada e testada por contrato SQL/TypeScript. Preserva as regras V2 de evidência:

- erro → 24h;
- acerto com evidência insuficiente → 24h;
- retenção confirmada → 7 dias;
- retenção estabelecida → 30 dias;
- evidência forte e consistente → 60 dias.

O attempt persiste `review_policy_version`, entradas relevantes e resultado aplicado. O RPC legado divergente não é fonte canônica V3.

### Caderno de erros

- tentativa incorreta elegível cria/reabre ocorrência idempotente;
- causa é fornecida/editável pelo aluno e eventos preservam histórico;
- attempt anulado/inválido não cria erro;
- correção posterior não apaga ocorrência: pode resolvê-la segundo regra explícita.

### Simulados

- resposta de simulado é imutável depois de confirmada; alteração exige comando explícito antes de avançar, se a política do modo permitir, com versionamento.
- finalização usa lock/estado esperado e é idempotente.
- cada `simulation_question` finalizada produz no máximo um attempt com `context = SIMULATION`, ligado por unique/`attempt_id`.
- a política define se esse contexto influencia domínio/revisão; simulado oficial V3 influencia desempenho e fila de recuperação, sem dupla contagem.

## Testes

- retry igual e retry com payload divergente;
- concorrência em duas abas;
- paridade da política 24h/7d/30d/60d;
- simulado finalizado duas vezes;
- exatamente um attempt por item do simulado;
- anulada, visual ausente, versão arquivada e índice fora de opções;
- reconstrução de agregados/outbox.

## Consequências

O núcleo pedagógico permanece forte e transacional; gamificação e relatórios deixam de ampliar a superfície de falha da resposta.

