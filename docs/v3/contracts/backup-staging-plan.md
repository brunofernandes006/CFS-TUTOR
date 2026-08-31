# Plano de backup, restauração e staging da V3

Status em 30/08/2026: contrato e ensaio operacional de staging concluídos; nenhuma escrita em produção.

## Inventário observado sem alterar produção

| Item | Evidência disponível | Estado |
|---|---|---|
| repositório | `brunofernandes006/CFS-TUTOR`, branch `main` | identificado |
| ambientes GitHub | `Preview` e `Production` existem | identificado por leitura |
| projeto Supabase de produção | identificado por leitura e pela assinatura exata das 20 migrations V2; ref mascarado `mcsy…fgzl`, região `ca-central-1`, `ACTIVE_HEALTHY` | identificado; ref completo permanece no runbook restrito |
| vínculo local | não há `.env.local`, `.vercel/project.json` nem projeto Supabase ligado no workspace | segregado |
| acesso operacional | connector Supabase autenticado e sempre chamado com `project_id` explícito | segregado por alvo |
| staging Supabase separado | `CFS-TUTOR-STAGING`, `rygcwnxbkftmrifejfbl`, `ca-central-1`, PostgreSQL 17.6, `ACTIVE_HEALTHY` | comprovado |

O identificador completo de produção permanece no runbook operacional de acesso restrito. A conferência foi somente leitura; migrations, fixture, pgTAP e rollback foram direcionados exclusivamente ao project ID de staging.

## Ensaio executado no staging

| Etapa | Evidência | Resultado |
|---|---|---|
| preflight | nome/ref/região/status conferidos; zero migrations e zero tabelas públicas | aprovado |
| migrations | 20 entradas separadas, de `001_source_ingestion` a `020_personal_access_gate` | aprovado |
| ordem reconciliada | `014_answer_key_annulment` → `015_prevent_annulled_real_questions` → `016_simulation_current_edital_scope` | aprovado |
| restore sintético | `supabase/fixtures/v2_upgrade_fixture.sql` aplicado em transação | aprovado |
| pgTAP schema | `phase0_schema_baseline_test.sql`, último TAP `ok 24` | 24/24 aprovado |
| pgTAP upgrade | `phase0_upgrade_fixture_test.sql`, último TAP `ok 11` | 11/11 aprovado |
| integridade | 22 tabelas públicas, 22 com RLS, 1 questão real rastreável, 0 attempts órfãos e 0 itens de simulado órfãos | aprovado |
| rollback | simulado sintético: 2 registros antes, 0 durante exclusão e 2 depois do rollback | aprovado |

Contagens após restore: 3 disciplinas; 1 proprietário; 2 fontes; e 1 registro em relacionamento de fontes, item do edital, prova, questão, vínculo de fonte, tentativa, caderno de erros, progresso, revisão, simulado e item de simulado. `access_key_hash` permaneceu no valor sintético esperado.

O primeiro diagnóstico amplo também restaurou corretamente 13 registros (`13 → 0 → 13`), mas sua flag esperava por engano 12. O ensaio foi corrigido para usar contagem derivada e repetido com sucesso; nenhuma perda persistiu.

Advisors pós-restore retornaram apenas informações esperadas da V2: 22 tabelas com RLS fechado e sem policies de cliente, e índices ainda não utilizados em uma fixture mínima. Não houve mudança para silenciar os avisos.

## Requisito anterior à primeira migration funcional

Antes de executar qualquer migration da Fase 1, devem existir e ser comprovados:

1. `PRODUCTION_PROJECT_ID` registrado no runbook restrito e conferido contra o inventário e a assinatura de migrations;
2. projeto Supabase de staging separado, com `STAGING_PROJECT_ID`, URL e chaves próprias;
3. estratégia de backup de produção aprovada e restore drill concluído em ambiente não produtivo; a captura imediatamente anterior a cada migration funcional continua obrigatória;
4. inventário separado de objetos de Storage, configurações de Auth, Edge Functions, secrets e integrações;
5. aprovação explícita do operador para o alvo staging.

Staging não pode reutilizar URL, banco, chaves ou projeto de produção. Dados produtivos só podem entrar após minimização/anonymização e autorização específica.

## Variáveis de ambiente

Automação operacional de banco usa secrets por ambiente: `SUPABASE_ACCESS_TOKEN`, `PRODUCTION_PROJECT_ID`, `PRODUCTION_DB_PASSWORD`, `STAGING_PROJECT_ID` e `STAGING_DB_PASSWORD`. Runtime usa, no ambiente correspondente, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SOURCE_BUCKET` e `CFS_DEFAULT_USER_ID` enquanto a V2 estiver ativa.

Esses valores não entram no Git, logs, artefatos de CI ou jobs de pull request. Os ambientes GitHub `Preview` e `Production` devem ter secrets isolados e proteção por aprovação; jobs de teste não recebem secrets de produção.

## Backup antes da Fase 1

1. Confirmar no painel do projeto de produção o plano de backup, última execução bem-sucedida e, quando contratado, o ponto recuperável por PITR.
2. Registrar timestamp UTC, responsável, project ref mascarado, versão de Postgres e migration head.
3. Produzir dumps lógicos de roles, schema e dados por ferramenta oficial, criptografar fora do workspace e registrar SHA-256/tamanho sem publicar o conteúdo.
4. Inventariar e copiar separadamente objetos de Storage: backup de banco não contém os objetos.
5. Exportar inventário reproduzível de Auth/configuração, Functions, secrets e integrações sem revelar valores.
6. Restaurar em staging, aplicar reconciliação, comparar contagens/invariantes e executar fresh/upgrade/pgTAP antes de declarar o artefato recuperável. O ensaio sintético da Fase 0 comprovou o procedimento; cada migration funcional ainda exige uma captura nova de produção.

Referências operacionais: [Supabase — Managing environments](https://supabase.com/docs/guides/deployment/managing-environments), [Database backups](https://supabase.com/docs/guides/platform/backups) e [Restore to a new project](https://supabase.com/docs/guides/platform/migrating-within-supabase/restore-to-new-project).

## Restauração

1. Declarar incidente, congelar escrita e preservar evidência.
2. Selecionar ponto de recuperação anterior ao incidente e restaurar primeiro em projeto não produtivo.
3. Reaplicar tombstones de exclusão de conta, restaurar Storage/configurações separadas e validar migrations, funções, grants, RLS, contagens e invariantes V2.
4. Executar testes SQL e aplicação; registrar RTO/RPO observado e aceite responsável.
5. Somente com autorização específica promover o ambiente recuperado ou restaurar produção. PITR/restore pode exigir indisponibilidade e nunca é ensaiado pela Fase 0.

## Barreiras para impedir testes em produção

- CI de banco usa exclusivamente o Supabase local iniciado por `supabase start`; não usa `--linked`.
- `supabase db reset --linked` é proibido em scripts e runbooks.
- Jobs de PR não recebem ambientes/secrets produtivos.
- Qualquer job de staging falha antes de mutar se o project ref/host coincidir com produção ou se `STAGING_PROJECT_ID` estiver vazio.
- Migration remota exige ambiente protegido, revisão humana, ref explícito e backup/restore drill vigente.
- Fixtures V2 e pgTAP são permitidos apenas em banco local/efêmero.

## Rollback da Fase 1

A Fase 1 deve seguir expand/contract: manter fluxo V2, flags novas desligadas por padrão e mudanças aditivas. O rollback primário desliga flags e retorna as rotas à autoridade V2. Se houver corrupção de dados, suspende-se escrita e usa-se o backup validado; não se tenta rollback destrutivo improvisado. Nenhuma coluna/tabela V2 é removida antes dos critérios de contract definidos nos ADRs.

## Critério do gate

O Gate 4 da Fase 0 está fechado: produção foi identificada sem escrita; staging separado foi comprovado; migrations/fixture/pgTAP/integridade foram validados; rollback transacional foi ensaiado. Antes de cada migration funcional permanece obrigatório gerar e validar uma captura de produção contemporânea, sem reutilizar a fixture como substituto de backup real.
