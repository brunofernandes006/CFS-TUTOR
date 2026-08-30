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

## Mapeamento de dados

| V2 | V3 | Tratamento |
|---|---|---|
| `app_users` | `auth.users` + `profiles` | mapear UUID legado ao usuário Auth ou reatribuir FKs em transação |
| `access_key_hash` | Supabase Auth | manter só durante coexistência |
| `DEFAULT_USER_ID` | `auth.uid()` | remover gradualmente de serviços/RPCs |
| tentativas/progresso/revisões/erros | mesmas entidades evoluídas | preservar timestamps e contagens; adicionar versão/contexto quando conhecido |
| sessões/simulados | entidades evoluídas | preservar status e respostas; checkpoint inicia nulo |
| currículo/fontes/questões | catálogo global versionado | manter IDs; vincular versão do edital |

## Etapas

### 1. Expandir schema

Adicionar perfis, preferências, papel privado, versões do edital/conteúdo, coleções, metas e estruturas de sessão sem remover colunas antigas. Criar índices de forma compatível com volume e janela de manutenção.

### 2. Introduzir Auth

Configurar email/senha, PKCE, cookies SSR, SMTP e URLs. Criar usuário proprietário da V2. Manter login legado sob flag e rota isolada.

### 3. Backfill de identidade

- tabela temporária/auditável de `legacy_user_id → auth_user_id`;
- atualizar todas as FKs privadas em transação controlada ou batches idempotentes;
- gerar relatório antes/depois por tabela;
- não alterar tabelas globais de conteúdo.

### 4. Políticas e grants

Aplicar RLS por tabela, operação e papel. Trocar RPCs para derivar usuário da sessão. Executar testes com anon, aluno A, aluno B e admin.

### 5. Dual read / shadow verification

Por curto período, comparar resultados de home, desempenho, revisões e simulados entre caminho V2 e V3 para o usuário migrado. Não duplicar mutações sem idempotência.

### 6. Cutover

- habilitar Auth V3 para grupo piloto;
- observar erros, divergência e latência;
- ampliar gradualmente;
- desligar login por chave;
- manter colunas legadas por uma janela de rollback.

### 7. Contract

Após janela estável:

- remover `DEFAULT_USER_ID`, cookie próprio e rota antiga;
- remover `access_key_hash` e políticas/RPCs legadas;
- revogar grants não usados;
- arquivar scripts e relatório final.

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

## Rollback

### Antes do cutover

Reverter flag e manter V2; novas tabelas permanecem sem uso. Migrations destrutivas são proibidas.

### Durante o piloto

Desligar V3, restaurar leitura V2 e preservar eventos V3 para reconciliação. Não executar restore global se somente uma feature falhou.

### Após cutover, antes do contract

Reativar login legado apenas para o proprietário migrado, usar tabela de mapeamento e views/compatibilidade. Reconciliar mutações V3 antes de voltar.

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

