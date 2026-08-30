# CFS Tutor V3 — autenticação multiusuário

## Objetivo

Substituir a chave pessoal e o `DEFAULT_USER_ID` por email e senha via Supabase Auth, com sessão SSR em cookies, progresso isolado por usuário e administração autorizada separadamente.

## Fluxos obrigatórios

- cadastro com email e senha;
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

Views expostas devem respeitar RLS com `security_invoker`. Cada migration inclui grants, RLS e testes allow/deny.

## Service role

Reservada para:

- ingestão e administração de conteúdo;
- jobs internos;
- migração;
- operações de suporte explicitamente autorizadas e auditadas.

Tentativas, favoritos, cadernos, metas e progresso comuns devem usar identidade do usuário ou RPC que derive `auth.uid()`, nunca aceitar `p_user_id` arbitrário do cliente.

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

1. Criar usuário Auth proprietário e perfil, sem remover acesso antigo.
2. Mapear o UUID legado para o novo `auth.users.id` em transação/migration controlada.
3. Atualizar FKs e dados de progresso com relatório de contagem.
4. Validar isolamento com dois usuários de teste.
5. Ativar Auth multiusuário atrás de flag.
6. Desativar cookie/chave antiga após janela de validação.
7. Remover `access_key_hash` e configuração fixa apenas em fase posterior.

Rollback mantém mapeamento reversível e snapshot; detalhes em [migration-plan.md](./migration-plan.md).

