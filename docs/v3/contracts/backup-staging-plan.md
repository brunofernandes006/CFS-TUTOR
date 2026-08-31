# Plano de backup, restauração e staging da V3

Status em 30/08/2026: contrato definido; comprovações operacionais indicadas abaixo.

## Inventário observado sem alterar produção

| Item | Evidência disponível | Estado |
|---|---|---|
| repositório | `brunofernandes006/CFS-TUTOR`, branch `main` | identificado |
| ambientes GitHub | `Preview` e `Production` existem | identificado por leitura |
| projeto Supabase de produção | o projeto existe operacionalmente, mas seu `project ref`, organização e região não estão versionados nem disponíveis na sessão | **não comprovado** |
| vínculo local | não há `.env.local`, `.vercel/project.json` nem projeto Supabase ligado no workspace | segregado |
| credencial CLI | `supabase projects list` falhou por ausência de access token; não foi feito login | segregado |
| staging Supabase separado | nenhuma evidência acessível de projeto/branch persistente | **não comprovado** |

O identificador de produção deve ser registrado em runbook operacional de acesso restrito, nunca neste documento público. A ausência de credencial nesta Fase 0 é deliberada e impede que testes atinjam produção.

## Requisito anterior à primeira migration funcional

Antes de executar qualquer migration da Fase 1, devem existir e ser comprovados:

1. `PRODUCTION_PROJECT_ID` registrado no runbook restrito e conferido por duas pessoas/duas fontes;
2. projeto Supabase de staging separado, com `STAGING_PROJECT_ID`, URL e chaves próprias;
3. backup recuperável de produção e restore drill concluído em ambiente não produtivo;
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
6. Restaurar em staging descartável, aplicar reconciliação, comparar contagens/invariantes e executar fresh/upgrade/pgTAP e smoke antes de declarar o backup recuperável.

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

Este plano fecha a definição documental. O gate operacional permanece pendente até que o project ref de produção esteja conferido em runbook restrito, staging separado exista e um restore drill seja evidenciado. Isso é requisito obrigatório antes da primeira migration funcional.
