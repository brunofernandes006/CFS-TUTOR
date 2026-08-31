# ADR 004 — Cache, persistência local e isolamento por usuário

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026

## Decisão

### Cache servidor

- Funções que leem sessão, cookies ou dados RLS privados são dinâmicas e `no-store`; não usam ISR nem `use cache` compartilhado.
- Cache compartilhado aceita apenas DTO global/publicado cuja função é pura em `contentVersion/syllabusVersion/locale` e não recebe/captura cliente de sessão.
- Resposta que pode emitir `Set-Cookie` nunca é armazenada em cache intermediário.
- `React.cache` pode deduplicar leitura dentro do mesmo request; não é persistência entre usuários.

### Browser

- Cache em memória privado tem chave composta por `authUserId`, versão de schema, recurso e filtros, e é destruído em logout/troca de conta.
- Persistência local permitida: IDs opacos, posição, índice de alternativa ainda não confirmada, filtros não sensíveis, `serverVersion`, timestamp e schema version.
- Proibido: token/sessão, email, enunciado, opções, explicação, gabarito, fonte privada, notas/caderno, desempenho ou payload de API completo.
- Namespace: `cfs:v3:{authUserId}:{schemaVersion}`. Logout local/global e evento de troca de usuário apagam o namespace e memória antes de navegar.
- Servidor sempre vence para resposta confirmada; conflito de rascunho não sobrescreve fato pedagógico.

### Service worker

- Allowlist exata de shell/assets públicos versionados; não basta confiar em `request.destination`.
- Nunca cacheia navegação, `/api/**`, endpoints Auth, URLs assinadas, assets de questão/fonte, conteúdo autenticado ou respostas com `private/no-store/Set-Cookie`.
- Troca de versão remove caches antigos. Offline inicial significa shell + aviso, não conteúdo privado.

### Testes

- usuário A → estado/cache → logout → usuário B;
- refresh de sessão com `Set-Cookie` e prefetch;
- inspeção de Cache Storage, local/session storage e IndexedDB;
- ausência de gabarito no prefetch;
- invalidação por publicação/versão;
- duas abas e conflito de `serverVersion`.

## Consequências

A retomada offline completa fica fora do primeiro corte. A V3 ganha continuidade mínima sem arriscar vazamento entre contas no mesmo dispositivo.

