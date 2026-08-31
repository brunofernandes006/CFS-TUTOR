# ADR 002 — Autorização de banco, RLS e RPCs V3

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026

## Decisão

Grants definem quais objetos uma role alcança; RLS define quais linhas. Toda migration exposta entrega e testa ambos. `anon` recebe zero acesso a dados do produto, exceto objetos públicos explicitamente aprovados.

### Clientes de servidor

- `user-scoped`: publishable key + JWT/cookies do usuário; usado em todo fluxo comum e sujeito a RLS.
- `admin`: secret/service role, módulo `server-only`, usado apenas após `requireAdmin` ou por ingestão/job/migration.
- `migration`: ferramenta operacional fora do runtime.

Importar o cliente admin em rota/serviço de aluno falha em lint/architecture test. Nunca se reutiliza um helper genérico que escolhe a chave por conveniência.

### RLS de propriedade

- `SELECT`: `to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = user_id)`.
- `INSERT`: `with check` com a mesma expressão.
- `UPDATE`: `using` e `with check`; o usuário não pode trocar o owner.
- `DELETE`: apenas quando previsto pelo produto.
- Em tabelas legadas durante coexistência, a policy usa helper privado que resolve `auth.uid()` para `legacy_user_id`; depois do contract passa a comparação direta.
- Propriedade indireta, como `simulation_questions`, é validada por existência do pai pertencente ao usuário; não se duplica `user_id`.

### RPCs privadas

- Operações simples usam `security invoker` e RLS.
- Quando atomicidade exige `security definer`, a função fica em schema não exposto, usa `set search_path = ''`, nomes totalmente qualificados, revoga `EXECUTE` de `PUBLIC`, `anon` e roles não necessárias e valida `auth.uid() is not null` no corpo.
- Quando a Data API precisar iniciar essa operação, um wrapper fino em schema `api` exposto é `security invoker`, não acessa tabelas secretas, deriva contexto da sessão e chama a função privada por grant explícito. O wrapper não aceita `p_user_id`; a função privada deriva novamente `auth.uid()` e valida owner. Alternativamente, o Route Handler usa conexão server-side user-scoped capaz de chamar a função privada. Não se coloca a função definer no schema exposto por conveniência.
- RPC comum nunca aceita `p_user_id`; identidade é derivada da sessão. IDs de recursos são validados contra propriedade dentro da mesma transação para impedir IDOR/BOLA.
- `service_role` pode chamar função administrativa separada, com nome/assinatura distinta e actor/reason auditados; nunca reutiliza a RPC do aluno passando outro usuário.
- RPCs V2 com `p_user_id` permanecem concedidas somente a `service_role` e nunca são promovidas a `authenticated`.

### Matriz mínima de grants

| Classe | `anon` | `authenticated` | admin backend |
|---|---|---|---|
| tabelas privadas | nenhum | grants mínimos + RLS owner | somente operação autorizada |
| API pública de questão | nenhum | `SELECT` apenas na view segura / `EXECUTE` nos comandos | leitura administrativa separada |
| tabela de gabarito | nenhum | nenhum | acesso server-only auditado |
| catálogo publicado sem segredo | nenhum por padrão | `SELECT` em view `security_invoker` | CRUD via backend |
| editorial/fontes brutas | nenhum | nenhum | grants mínimos |
| funções de aluno | nenhum | `EXECUTE` explícito | não necessário |
| funções administrativas | nenhum | nenhum | `EXECUTE` explícito |

Views expostas usam `security_invoker = true`. Tabelas internas e funções privilegiadas ficam fora dos schemas da Data API.

## Testes obrigatórios

Cada objeto privado tem casos SQL para:

- anon sem sessão;
- aluno A no próprio registro;
- aluno A tentando ID/owner do aluno B;
- aluno B;
- admin autenticado sem usar service role, que continua sem acesso comum por papel;
- backend admin/service role no endpoint autorizado;
- sessão expirada/nula;
- `UPDATE` que tenta trocar `user_id`;
- chamada REST direta à tabela e chamada RPC;
- grants e policies ausentes/inesperados;
- advisor e catálogo procurando `SECURITY DEFINER` em schema exposto, `PUBLIC EXECUTE` e `search_path` não vazio.

## Consequências

O backend privilegiado deixa de mascarar políticas quebradas. Operações administrativas exigem autorização explícita, e as operações do aluno são protegidas mesmo se um filtro de aplicação for omitido.
