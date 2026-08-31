# Contrato — baseline de grants, RLS e clientes

Esta matriz descreve a V2 congelada e a superfície a preservar até a Fase 2. Ela não concede acesso novo.

## Clientes

| Ator | Credencial | RLS | Acesso V2 esperado |
|---|---|---:|---|
| `anon` | publishable/anon | sim | zero linha de produto; zero RPC de domínio |
| `authenticated` | JWT de usuário | sim | zero linha na V2; zero RPC V2 |
| backend V2 | `service_role`, módulo `server-only` | bypass | rotas protegidas pelo proxy e domínio fixo do proprietário |
| migration/operador | conexão administrativa local/controlada | privilegiado | somente operação explícita; fora do runtime |

As 22 tabelas públicas possuem RLS habilitada e não há policies de aluno nas migrations V2. As cinco RPCs de domínio (`record_question_attempt_v2`, `create_simulation_v2`, `answer_simulation_question_v2`, `finalize_simulation_v2`, `get_simulation_v2`) revogam `PUBLIC`, `anon` e `authenticated` e concedem `EXECUTE` apenas a `service_role`.

## Limites conhecidos

- `service_role` mascara falhas de policy; por isso testes unitários da aplicação não provam isolamento.
- As RPCs V2 são `SECURITY DEFINER`, aceitam `p_user_id` e usam `search_path = public`; elas são legado server-only e não serão promovidas à V3.
- O helper REST genérico V2 pode operar qualquer tabela com `service_role`; ele não pode ser importado por futuras rotas comuns V3.
- Grants efetivos do ambiente remoto não foram consultados na Fase 0, por proibição de alterar/conectar produção. O pgTAP local e uma auditoria read-only autorizada futura devem confirmar o catálogo.

## Matriz obrigatória futura

Toda migration V3 deve testar `anon`, aluno A, aluno B, admin autenticado, backend admin e `service_role`, cobrindo REST direto, view e RPC. Nenhuma aprovação usa somente o caminho server-side privilegiado como evidência de RLS.
