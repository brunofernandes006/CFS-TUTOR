# Contrato — invariantes congeladas da V2

Este contrato é normativo durante todo o expand/contract. Alteração exige decisão explícita, teste de regressão e atualização do baseline; uma feature flag não pode enfraquecê-lo.

## Conteúdo e rastreabilidade

- O edital vigente é a árvore de estudo corrente.
- Questão `[QUESTÃO REAL]` exige prova, gabarito oficial, vínculo de fonte e revisão humana rastreáveis.
- Questão anulada mantém estado explícito e não recebe alternativa correta inventada.
- Questão histórica fora do edital ativo não entra automaticamente no treino corrente.
- Questão dependente de elemento visual não é liberada sem o recurso oficial preservado.
- Domínio e prontidão só aparecem com evidência suficiente; incidência deriva de múltiplas provas reais.

## Regras pedagógicas

- Prova oficial: 20 Português, 20 Matemática, 20 Conhecimentos Profissionais; pesos 3, 2 e 5.
- Revisão preservada: 24h → 7d → 30d, adaptada por acerto/erro e evidência.
- Caderno de erros exige causa explícita e não cria erro para questão anulada.
- Simulado adaptativo aceita de 10 a 60 itens; o oficial exige pool íntegro.

## Segurança e estado

- A V2 identifica um único proprietário pelo cookie HttpOnly `cfs_access` e `CFS_DEFAULT_USER_ID`.
- O hash da chave pessoal permanece em `app_users.access_key_hash` até o cutover definido pelo ADR 001.
- Toda rota V2 protegida usa apenas `LEGACY_OWNER`; Supabase Auth não participa da decisão.
- O backend V2 usa `service_role`; RPCs V2 não são executáveis por `anon` ou `authenticated`.
- Respostas de API são `no-store`; o service worker não armazena navegações, documentos autenticados ou `/api/**`.
- A leitura inicial de questão não contém gabarito ou explicação. O simulado em andamento não revela correção.

## Evidência automatizada

Os checksums em `docs/v3/baselines/v2-migrations.sha256.json`, o mapa de rotas e `__tests__/phase0-contracts.test.ts` detectam mudança acidental. O harness pgTAP prova schema, RLS/grants e preservação de fixture quando o ambiente local estiver operacional.
