# CFS Tutor V3 — plano de migração

## Objetivo

Migrar V2 single-user para V3 multiusuário sem perda de progresso, sem enfraquecer rastreabilidade e com rollback verificável. A migração é expand/contract: primeiro adicionar compatibilidade, depois migrar, por fim remover legado.

## Pré-condições

- backup lógico e snapshot verificáveis;
- inventário/contagem por tabela e órfãos;
- ambiente de staging com cópia sanitizada;
- usuário Auth proprietário definido;
- flags de V3 desligadas por padrão;
- testes RLS allow/deny automatizados;
- Node.js 22+ e dependências Auth fixadas;
- nenhuma questão real inválida no baseline.
- suíte V2 restaurada e verde; harness `supabase/tests/**` aplica banco novo e upgrade de fixture V2;
- ADRs 001–006 aceitos e mapa explícito de rota/método para `PUBLIC`, `LEGACY_OWNER` ou `AUTH_V3`;
- inventário da tabela de histórico/checksum das migrations, inclusive os dois prefixos `014`;

## Mapeamento de dados

| V2 | V3 | Tratamento |
|---|---|---|
| `app_users` | ponte para `auth.users` + `profiles` | adicionar `auth_user_id`; manter PK/FKs V2 no expand; sem reatribuição big bang |
| `private.legacy_user_auth_map` | novo temporário/auditável | relação única, lote, estado e checksums; sem grants ao cliente |
| `access_key_hash` | Supabase Auth | lido somente por rotas `LEGACY_OWNER`; zero uso no cutover; drop no contract |
| `DEFAULT_USER_ID` | `auth.uid()` | proibido em `AUTH_V3`; zero uso comum no cutover; remoção física no contract |
| tentativas/progresso/revisões/erros | mesmas entidades evoluídas | preservar timestamps e contagens; adicionar versão/contexto quando conhecido |
| sessões/simulados | entidades evoluídas | preservar status e respostas; checkpoint inicia nulo |
| currículo | conceito + `syllabus_version_items` | manter IDs dos conceitos e criar associação da versão V2 |
| questões/gabarito | apresentação + resposta privada | versão-baseline; gabarito em schema não exposto; histórico preservado |

## Etapas

### 1. Expandir schema

Adicionar `app_users.auth_user_id`, `private.legacy_user_auth_map`, perfis, preferências e papel privado sem remover colunas/FKs. Para cada tabela privada V2 que entrar no piloto, adicionar `auth_user_id` sombra nula. Revogar default privileges não desejados e criar grants/policies explicitamente. Tabelas de produto posteriores não entram nesta migration de identidade.

### 2. Introduzir Auth

Configurar email/senha, PKCE, cookies SSR, SMTP e URLs. Criar usuário proprietário por operação administrativa idempotente: localizar/criar Auth por email, criar perfil, inserir mapa `PENDING`, preencher ponte e marcar `VERIFIED` após reconciliação. Para cada nova conta Auth, criar linha `app_users` de compatibilidade com `id = auth_user_id` e chave nula até a contração das FKs. Senha não entra em migration/log. Signup inicial é por convite/aprovação.

O piloto usa `/v3/**`. Cada rota/método tem `auth_mode` único. Não existe rota que aceite cookie legado e Auth como alternativas.

### 3. Backfill de identidade

- manter FKs V2 apontando para `app_users`;
- preencher a coluna sombra Auth por batches idempotentes e escrever `user_id` de compatibilidade + `auth_user_id` em novas linhas na mesma transação;
- preservar IDs, timestamps, attempts, respostas, contagens, revisão e erros;
- gerar relatório antes/depois, checksum lógico, divergentes e órfãos por tabela/lote;
- FK/NOT NULL Auth só depois de reconciliação completa;
- não alterar tabelas globais de conteúdo.

O mesmo padrão cria `syllabus_version_items`, versões-baseline de questão e `question_answer_versions`, preenchendo attempts/simulation items sem recalcular fatos históricos.

### 4. Políticas e grants

Aplicar a matriz do ADR 002 por tabela/operação. Policies de tabelas V3/tocadas comparam `auth.uid()` à coluna Auth; helper privado de ponte só serve relação V2 read-only ainda não expandida. Criar clientes user/admin separados. RPCs V3 de aluno têm novos nomes/assinaturas, derivam `auth.uid()`, rejeitam sessão nula e validam propriedade. Quando definer, ficam privadas com `search_path = ''`; a Data API chama wrapper `security invoker` exposto e sem `p_user_id`. Nunca conceder RPC V2 com `p_user_id` a `authenticated`.

Executar testes anon, A próprio, A→B, B, admin autenticado, backend admin e service-role, incluindo REST direto, owner mutation, ausência de grants e catálogo de funções. O aluno não recebe grant às tabelas de gabarito/fontes brutas.

### 5. Dual read / shadow verification

Por no mínimo sete dias, comparar home, desempenho, revisões, erros e simulados entre V2 e V3 para o proprietário. Não fazer dual-write de comandos sem idempotência. Submissões V3 usam chave única, política de revisão canônica e outbox; simulados geram exatamente um attempt por item apenas na finalização.

### 6. Cutover

- exigir mapa `VERIFIED`, checksums iguais, testes A/B/cookies/cache verdes, zero import de `service_role`/`DEFAULT_USER_ID` em fluxo comum e restore drill aprovado;
- numa única release, classificar todas as rotas comuns como `AUTH_V3`, converter URLs piloto para finais sem colisão e expirar `cfs_access`;
- desligar login por chave e parar de ler `access_key_hash`, `DEFAULT_USER_ID` e RPCs V2;
- marcar mapa `CUTOVER`; manter estruturas legadas fisicamente por rollback.

### 7. Contract

Após duas releases e no mínimo 14 dias estáveis:

- provar por busca CI que não há uso runtime de `DEFAULT_USER_ID`, cookie, `access_key_hash` ou RPCs legadas;
- remover configuração/código legado e `access_key_hash`; revogar/drop de RPCs legadas;
- remover `app_users` somente se zero FK depender dela; do contrário torná-la read-only e contrair na última migration de FK;
- revogar grants não usados;
- preservar o mapa para auditoria/rollback e arquivá-lo apenas em contract posterior;
- arquivar scripts e relatório final.

## Migração de tentativas, revisões, erros e simulados

1. Criar versão-baseline de questão/resposta privada.
2. Adicionar colunas V3 nulas: versão, contexto, idempotência e policy version.
3. Backfill histórico sem inventar policy version quando desconhecida; marcar `LEGACY_V2`.
4. Novas submissões V3 executam núcleo transacional + outbox conforme ADR 006.
5. `ReviewPolicyV3` passa por testes de paridade 24h/7d/30d/60d antes de ser ativada; o SQL V2 divergente não é reutilizado.
6. `simulation_questions` recebe versão e `attempt_id`; finalização idempotente cria um attempt por item e nunca muda resultado histórico pela edição corrente.
7. Caderno de erros é reconciliado com attempts elegíveis; anuladas/inválidas não criam ocorrência.

## Migração de consultas e performance

As rotas tocadas por uma fase já saem paginadas e sem N+1. Antes de ativar cada rota:

- substituir sorteio/download de até 2.000 questões por seleção no banco;
- substituir joins em memória do caderno por view/query batch;
- remover limites silenciosos de 5.000 attempts em home/desempenho;
- definir cursor opaco, padrão 25, máximo 100 e índices correspondentes;
- registrar `EXPLAIN (ANALYZE, BUFFERS)` em fixture de volume representativo.

## Migração de conteúdo V3

Conteúdo real por item não deve ser fabricado por migration. O schema é criado vazio; admin importa e revisa unidades, fontes e relações. Publicação ocorre somente após validação editorial. Itens sem conteúdo continuam visíveis com estado honesto.

## Validações

- contagem e checksum lógico de dados privados por usuário;
- zero FKs órfãs;
- tentativas e respostas de simulados preservadas;
- agenda de revisão consistente;
- nenhum dado do usuário A visível ao B;
- admin não acessível a aluno;
- corpus e rastreabilidade inalterados;
- queries críticas dentro do orçamento;
- `supabase test db`, advisors e migration list sem falhas aplicáveis.
- nenhuma role de aluno alcança gabarito/correção por tabela, view, REST, GraphQL ou RPC;
- nenhum payload/prefetch/cache contém campo proibido antes da submissão/finalização;
- A → logout → B não preserva estado/cache do primeiro usuário;
- exatamente um owner por rota e um attempt por item finalizado de simulado.

## Rollback

### Antes do cutover

Reverter flag e manter V2; novas tabelas permanecem sem uso. Migrations destrutivas são proibidas.

### Durante o piloto

Desligar `/v3`/rotas `AUTH_V3`, restaurar `LEGACY_OWNER` somente nas rotas previstas e preservar eventos V3 para reconciliação. Não habilitar modo híbrido nem executar restore global se somente uma feature falhou.

### Após cutover, antes do contract

Reativar release anterior apenas para o proprietário mapeado, usando o mapa verificado; reconciliar mutações V3 antes de voltar. Isso é um rollback operacional controlado, não aceitação simultânea dos dois cookies.

### Após contract

Exige migration forward corretiva ou restore ensaiado. Por isso o contract só ocorre após janela definida, backup testado e aprovação explícita.

## Critério de encerramento

- todos os usuários usam Auth;
- nenhuma referência a `DEFAULT_USER_ID` ou cookie legado em runtime;
- RLS e grants testados;
- dados V2 conciliados;
- backup e rollback documentados;
- login antigo removido;
- relatório de migração aprovado.
- `app_users` não tem FKs dependentes ou está explicitamente read-only aguardando último contract;
- mapa de rota demonstra `AUTH_V3` para toda operação comum;
- contratos públicos não expõem gabarito e queries críticas são paginadas.
