# Modelo de Simulados — Fase 8A

## Estado atual

A Fase 8A foi concluída no ponto de arquitetura e backend solicitado: tabelas de simulados, serviço de geração/respostas, API Routes e testes em memória já foram criados e validados.

## Objetivo

Definir o modelo de persistência e regras de negócio para simulados oficiais e adaptativos, sem iniciar a interface da aplicação nem a próxima fase.

## Estrutura do banco

### Tabela: simulations

Campos principais:
- id: identificador do simulado
- user_id: usuário dono do simulado
- simulation_type: OFICIAL ou ADAPTATIVO
- status: PENDING, ACTIVE, FINISHED, ABANDONED
- target_questions: quantidade esperada de questões
- time_limit_seconds: tempo limite do simulado
- started_at, finished_at, duration_seconds
- score_portuguese, score_math, score_professional
- weighted_final_score
- minimums_met
- created_at, updated_at

Relacionamentos:
- user_id -> users(id)

### Tabela: simulation_questions

Campos principais:
- simulation_id
- question_id
- discipline
- order_number
- weight
- answered

Regra:
- cada questão é anexada ao simulado apenas uma vez
- há unique(simulation_id, question_id)

### Tabela: simulation_attempts

Campos principais:
- simulation_id
- user_id
- started_at, finished_at, elapsed_seconds
- completed

Regra:
- um simulado tem no máximo uma tentativa registrada por usuário

### Tabela: simulation_answers

Campos principais:
- simulation_id
- question_id
- selected_option_index
- correct_option_index
- is_correct
- response_time_seconds
- answered_at

Regra:
- a resposta é única por simulado e questão

## Regras de negócio

### Simulado oficial

- gera lista em quantidade fixa por disciplina
- considera apenas questões ativas
- valida que há volume suficiente antes de criar o registro
- persiste as questões selecionadas em simulation_questions
- mantém o status inicial em PENDING ou ACTIVE conforme o fluxo

### Simulado adaptativo

- gera um conjunto proporcional ao perfil do usuário e a disciplina alvo
- usa a mesma estrutura base de persistência
- mantém a mesma lógica de resposta e conclusão

## Arquivos relevantes

- lib/services/simulationSchema.ts
- lib/services/simulationService.ts
- app/api/simulations/route.ts
- app/api/simulations/[id]/route.ts
- app/api/simulations/[id]/start/route.ts
- app/api/simulations/[id]/answer/route.ts
- app/api/simulations/[id]/finish/route.ts
- __tests__/helpers/simulationFixtures.ts
- __tests__/simulation.test.ts

## Critérios de aprovação desta fase

- build do Next.js sem erros reais
- banco real íntegro
- tabelas de simulado vazias em produção
- sem gravação de fixtures de teste na base real
- testes automatizados em memória aprovados

## Conclusão

Este modelo é um backend isolado de simulados, pronto para evolução de interface e para a Fase 8B sem contaminar dados reais do sistema de produção.
