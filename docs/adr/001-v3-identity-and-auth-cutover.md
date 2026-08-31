# ADR 001 — Identidade V3 e cutover de autenticação

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026
- **Escopo:** decisão documental; não autoriza migration

## Contexto

A V2 usa `public.app_users.id` como PK de domínio e um cookie pessoal global. As tabelas privadas apontam para esse UUID. A V3 usará Supabase Auth, mas reescrever todas as FKs de uma vez criaria risco de perda e rollback difícil.

## Decisão

`auth.users.id` é a identidade de autenticação canônica após o cutover. Durante a migração, `app_users` permanece como ponte de domínio; não é substituída por uma segunda tabela concorrente.

### Estruturas de expansão

1. `private.legacy_user_auth_map`:
   - `legacy_user_id uuid primary key references public.app_users(id)`;
   - `auth_user_id uuid unique not null references auth.users(id)`;
   - `state` em `PENDING | VERIFIED | CUTOVER | RETIRED`;
   - `created_at`, `verified_at`, `cutover_at`, `retired_at`;
   - contagens/checksums antes e depois e identificador do lote;
   - sem grants a `anon` ou `authenticated`.
2. `public.app_users.auth_user_id uuid null unique references auth.users(id)`, usado como ponte materializada e verificável.
3. `public.profiles.id` referencia `auth.users.id`; perfil não substitui a PK de domínio durante coexistência.

Até o contract, toda conta Auth ativa possui uma linha de compatibilidade em `app_users`: o proprietário preserva seu UUID legado; usuários novos usam `app_users.id = auth.users.id`, `auth_user_id = auth.users.id` e `access_key_hash = null`. Isso satisfaz FKs V2 sem conceder autenticação legada nem criar uma segunda autoridade.

### Criação do proprietário Auth

- É uma operação administrativa one-shot, idempotente por email normalizado e registro de lote.
- Primeiro cria-se o usuário Auth com email confirmado conforme política do ambiente; a senha inicial nunca é armazenada em migration ou log.
- Em seguida cria-se `profiles` e o mapa legado dentro de transação de aplicação controlada.
- Se já existir mapa verificado para o legado, a operação retorna o mesmo resultado e não cria outro usuário.
- O UUID Auth é o efetivamente emitido pelo Auth; não se tenta forçar o UUID legado.

### Backfill idempotente

- As tabelas V2 mantêm `user_id → app_users.id` durante o expand.
- As tabelas privadas V2 recebem `auth_user_id` sombra quando forem abertas a usuários V3. O proprietário é backfilled pela ponte; novas linhas escrevem `user_id` de compatibilidade e `auth_user_id = auth.uid()` na mesma operação.
- O backfill não altera timestamps, IDs, respostas, contagens ou fatos pedagógicos.
- Leituras V3 resolvem o proprietário Auth pela ponte; novas tabelas V3 usam `auth.users.id` diretamente.
- A coluna sombra começa nula, é preenchida por join com `app_users.auth_user_id` em batches reexecutáveis e recebe FK/NOT NULL somente após reconciliação. Não se remove o `user_id` legado nessa etapa. Policies V3 comparam `auth.uid()` à sombra, evitando lookup em cada row.
- Cada lote registra quantidade esperada, atualizada, já correta, divergente e órfã. Reexecução de lote concluído é no-op.

### Autoridade única por rota

Cada rota tem exatamente um `auth_mode` em configuração server-only versionada:

- `LEGACY_OWNER`: aceita apenas `cfs_access` e fixa o domínio no único `legacy_user_id`; rejeita sessão Auth como autoridade.
- `AUTH_V3`: aceita apenas sessão Supabase Auth; deriva usuário de `auth.uid()`; ignora e remove o cookie legado.
- `PUBLIC`: não resolve usuário.

Não existe modo “legacy ou Auth”. O mapa de rotas é allowlist explícita e coberta por teste. Durante piloto, páginas/APIs V3 usam prefixo `/v3`; URLs atuais permanecem V2. Route groups não são usados para manter duas páginas na mesma URL.

### Cutover

O cutover só pode ocorrer quando:

1. proprietário Auth, perfil e mapa estão `VERIFIED`;
2. contagens/checksums de todas as tabelas privadas coincidem;
3. nenhuma rota `AUTH_V3` importa cliente `service_role`, usa `DEFAULT_USER_ID` ou aceita `p_user_id` de aluno;
4. testes anon/A/B/admin/service-role e cookies cruzados estão verdes;
5. dual-read do proprietário coincide por uma janela mínima de sete dias, sem dual-write não idempotente;
6. backup e restore drill foram aprovados;
7. todas as rotas comuns foram classificadas `AUTH_V3` e o mapa é congelado na release de cutover.

Na release de cutover:

- o cookie legado é expirado em toda resposta de Auth/login/logout;
- `proxy.ts` passa a reconhecer somente sessão Auth nas URLs comuns;
- `auth.uid()` torna-se a única autoridade para usuário comum;
- o mapa passa a `CUTOVER`;
- `access_key_hash`, rota de login legado e `DEFAULT_USER_ID` permanecem fisicamente, porém **não são mais lidos pelo runtime comum**.

### Contract e momento exato de aposentadoria

Após duas releases estáveis e no mínimo 14 dias sem rollback:

1. busca CI confirma zero referência runtime a `cfs_access`, `access_key_hash`, `DEFAULT_USER_ID` e RPCs V2;
2. não há sessão V2 em andamento incompatível;
3. restore drill e relatório de reconciliação estão aprovados;
4. uma migration de contract revoga RPCs/grants legados, remove `access_key_hash` e, se todas as FKs já foram migradas, remove `app_users`; caso contrário, `app_users` vira tabela de compatibilidade somente leitura até o último FK ser contraído;
5. o mapa é arquivado/auditado e só é removido em contract posterior, nunca na mesma migration que remove as FKs.

Assim, `app_users` e `access_key_hash` deixam de ser **utilizados** no cutover e deixam de **existir** apenas no contract posterior.

## Rollback

- Antes do cutover: desligar rotas `/v3`; nenhum dado V2 foi reescrito.
- Piloto: voltar cada rota para `LEGACY_OWNER`; preservar eventos V3 para reconciliação; não apagar usuário Auth nem mapa.
- Após cutover e antes do contract: rollback só para o proprietário mapeado, por release anterior e mapa verificado; reconciliar mutações Auth antes de reabrir V2.
- Após contract: somente roll-forward corretivo ou restore ensaiado. O contract é irreversível por feature flag.

## Consequências

Há coexistência de chaves por um período, mas nunca coexistência de autoridades dentro de uma rota. A ponte reduz o risco e permite preservar integralmente o histórico V2.
