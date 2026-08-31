# CFS Tutor V3 — autenticação multiusuário

## Objetivo

Substituir a chave pessoal e o `DEFAULT_USER_ID` por email e senha via Supabase Auth, com sessão SSR em cookies, progresso isolado por usuário e administração autorizada separadamente.

## Fluxos obrigatórios

- convite/aprovação e ativação com email e senha; signup público fica desabilitado no primeiro corte;
- confirmação de email, configurável por ambiente;
- login;
- logout local e global quando necessário;
- solicitação de recuperação sem revelar se o email existe;
- troca de senha após link PKCE;
- alteração de senha autenticada;
- sessão expirada e reautenticação;
- exclusão/desativação administrativa com política de retenção.

Produção exige SMTP próprio; o serviço padrão é apenas para desenvolvimento/teste.

## Sessão Next.js

- Clientes separados para browser e servidor.
- Sessão armazenada em cookies e renovada pela integração SSR suportada.
- Proxy atual passa a atualizar/verificar sessão, não comparar cookie próprio.
- Server Components e ações sensíveis verificam usuário no servidor; não confiam apenas em estado cliente.
- Rotas autenticadas são dinâmicas. Nunca usar ISR em resposta que possa renovar sessão ou emitir `Set-Cookie`.
- Prefetch de rota só ocorre quando cookies de sessão já estão estabelecidos.

## Identidade e perfil

`auth.users` guarda credenciais. `public.profiles` guarda apenas dados de aplicação:

- `id` igual a `auth.users.id`;
- nome de exibição;
- timezone e locale;
- status da conta;
- timestamps.

Preferências ficam em `user_preferences`. Não duplicar email ou senha como fonte de verdade no schema público.

Durante a migração, `public.app_users.id` continua sendo a PK de domínio V2 e ganha `auth_user_id` como ponte. O proprietário preserva o UUID legado; cada conta Auth nova ganha linha de compatibilidade `app_users.id = auth.users.id`, sem chave pessoal, enquanto existirem FKs V2. `private.legacy_user_auth_map` registra a migração do proprietário, estado, lote e reconciliação. O UUID Auth do proprietário não é forçado a coincidir com o legado. O procedimento normativo está no [ADR 001](../adr/001-v3-identity-and-auth-cutover.md).

## Autoridade de identidade por fase e rota

| Fase | Rotas V2 | Rotas piloto `/v3/**` | Autoridade |
|---|---|---|---|
| antes do piloto | `LEGACY_OWNER` | inexistentes/desligadas | cookie legado fixa somente o proprietário V2 |
| piloto | `LEGACY_OWNER` | `AUTH_V3` | cada rota aceita exatamente um mecanismo |
| cutover | convertidas para `AUTH_V3` | incorporadas às URLs finais | somente `auth.uid()` |
| contract | não existem | `AUTH_V3` | somente `auth.uid()`; legado removido |

O mapa allowlist `rota/método → auth_mode` é server-only, revisado em CI e deny-by-default. Nunca existe fallback “cookie legado ou Supabase Auth”. Uma rota `AUTH_V3` rejeita autoridade legada e expira `cfs_access`; uma rota `LEGACY_OWNER` não usa sessão Auth para escolher usuário. Login/logout Auth removem o cookie legado. Após o cutover, nenhuma operação comum lê `DEFAULT_USER_ID`, `access_key_hash` ou o mapa para definir o ator.

## Administração

Papéis não usam `raw_user_meta_data`/`user_metadata`, pois são editáveis pelo usuário. A fonte canônica é uma tabela em schema privado, mantida somente por operação administrativa segura. `app_metadata` pode espelhar o papel para UX, mas não substitui a verificação canônica em operação sensível e pode ficar desatualizada até renovar token.

Papéis iniciais:

- `student`: consumo e dados próprios;
- `content_reviewer`: revisa conteúdo e questões;
- `admin`: publica, gerencia fontes e acessos administrativos.

## Matriz de autorização

| Recurso | Aluno | Revisor | Admin |
|---|---|---|---|
| conteúdo publicado | leitura | leitura | leitura |
| progresso próprio | CRUD controlado | próprio | próprio; suporte excepcional auditado |
| fontes privadas | metadados autorizados | leitura necessária | CRUD via backend |
| rascunho editorial | não | leitura/edição atribuída | CRUD |
| publicação | não | sugerir | sim |
| reportes | criar e ver o próprio | tratar atribuídos | todos |
| papéis/usuários | próprio perfil | próprio perfil | administração limitada |

## RLS

Padrão de tabelas privadas:

- `SELECT`: usuário autenticado e proprietário;
- `INSERT`: `WITH CHECK` proprietário;
- `UPDATE`: `USING` e `WITH CHECK` proprietário;
- `DELETE`: proprietário, somente onde o produto permitir.

Tabelas de conteúdo:

- grants mínimos para `authenticated`;
- `SELECT` apenas de registros publicados/ativos;
- nenhuma política de escrita para cliente;
- mutações administrativas pelo backend após autorização.

Views expostas usam `security_invoker = true`. Grants e RLS são controles separados: toda migration inclui `REVOKE/GRANT`, `ENABLE RLS`, policies por operação e testes allow/deny. `anon` não recebe acesso aos dados do produto. `UPDATE` sempre tem policy de `SELECT`, `USING` e `WITH CHECK`.

Durante coexistência, policies de tabelas V2 resolvem `auth.uid()` para `legacy_user_id` por helper privado mínimo. Tabelas V3 usam owner Auth direto. Relações filhas, como `simulation_questions`, autorizam por join com o pai; não duplicam owner.

### Matriz operacional obrigatória

| Objeto | Aluno | Admin backend | `anon` |
|---|---|---|---|
| perfil/preferência próprios | grants mínimos + RLS owner | suporte auditado | nenhum |
| attempts/progresso/revisão/erros/sessões/simulados | RPC invoker/definer segura + RLS owner | suporte separado | nenhum |
| catálogo publicado sem segredo | `SELECT` em view segura | CRUD autorizado | nenhum por padrão |
| gabarito/correção/fonte bruta/editorial | nenhum | acesso mínimo auditado | nenhum |
| funções de aluno | `EXECUTE` explícito | não reutilizadas para impersonar | nenhum |
| funções administrativas | nenhum | `EXECUTE` explícito | nenhum |

## Service role

Reservada para:

- ingestão e administração de conteúdo;
- jobs internos;
- migração;
- operações de suporte explicitamente autorizadas e auditadas.

Tentativas, favoritos, cadernos, metas e progresso comuns devem usar identidade do usuário ou RPC que derive `auth.uid()`, nunca aceitar `p_user_id` arbitrário do cliente.

Existem módulos distintos: `user-scoped` usa cookies/JWT e RLS; `admin` usa secret/service role e `server-only`; `migration` não integra o runtime. Teste de arquitetura proíbe importar o cliente admin em `app/(student)`, `/api/v3` de aluno e serviços de domínio comuns. O backend administrativo primeiro valida sessão, depois consulta `private.user_roles`; `user_metadata` nunca autoriza.

## RPCs e IDOR/BOLA

- Operação simples permanece `security invoker`.
- `SECURITY DEFINER` só quando a transação realmente precisar, em schema não exposto, com `search_path = ''`, objetos qualificados e `EXECUTE` revogado de `PUBLIC` e `anon`.
- RPC de usuário rejeita `auth.uid() is null`, deriva o ator e confere propriedade do recurso na mesma transação.
- Nenhuma RPC privada do aluno aceita `p_user_id`. Operação administrativa em outro usuário tem função/endpoint separado, actor, alvo, motivo e auditoria.
- RPCs V2 que aceitam `p_user_id` continuam exclusivas de `service_role` e jamais recebem grant para `authenticated`.

Testes SQL obrigatórios: anon, A próprio, A→B, B próprio, admin autenticado sem privilégio implícito, backend admin autorizado, `service_role`, sessão expirada, troca de owner em UPDATE, REST direto e RPC. O catálogo também é testado contra função definer em schema exposto, `PUBLIC EXECUTE` ou `search_path` aberto. Ver [ADR 002](../adr/002-v3-database-authorization-and-rpcs.md).

## Proteções adicionais

- rate limit em login, cadastro, reset e reportes;
- respostas neutras para recuperação de senha;
- redirect URLs em allowlist;
- cookies `Secure` em produção e política adequada de `SameSite`;
- proteção CSRF/origin para mutações baseadas em cookie;
- CSP e headers existentes mantidos/fortalecidos;
- logs sem senha, token, chave ou conteúdo privado;
- expiração curta para operações administrativas sensíveis;
- revogação de sessões antes de excluir usuário quando necessário.

## Migração da conta única

1. Expandir `app_users.auth_user_id`, criar colunas sombra Auth nas tabelas privadas tocadas e `private.legacy_user_auth_map`, sem reescrever FKs.
2. Criar o proprietário Auth por operação administrativa idempotente, perfil e mapa; senha nunca entra em SQL/log.
3. Backfill idempotente preserva IDs/timestamps/fatos e registra contagens/checksums por lote.
4. Pilotar somente `/v3/**` em `AUTH_V3`; rotas V2 permanecem `LEGACY_OWNER`.
5. Validar dual-read, isolamento A/B, cookies cruzados e restore durante no mínimo sete dias.
6. No cutover, converter todas as rotas comuns para `AUTH_V3`, expirar cookie e parar de ler `access_key_hash`, `DEFAULT_USER_ID` e RPCs legadas.
7. Após duas releases e no mínimo 14 dias estáveis, executar contract: remover `access_key_hash`; remover `app_users` apenas quando nenhuma FK depender dela; arquivar o mapa em etapa posterior.

Rollback antes do contract usa flag por rota e mapa verificado; depois do contract exige roll-forward ou restore ensaiado. Detalhes em [migration-plan.md](./migration-plan.md) e no [ADR 001](../adr/001-v3-identity-and-auth-cutover.md).
