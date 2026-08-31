# Contrato — mapa de autenticação por rota/método

Fonte executável: `docs/v3/baselines/v2-route-auth-map.json`.

## Modos

| Modo | Autoridade de identidade | Uso na Fase 0 |
|---|---|---|
| `PUBLIC` | nenhuma | somente `POST /api/auth/login` e recursos públicos exatos do proxy |
| `LEGACY_OWNER` | cookie `cfs_access` validado; domínio fixo em `CFS_DEFAULT_USER_ID` | todas as demais rotas e páginas V2 |
| `AUTH_V3` | futuramente `auth.uid()` | proibido; não há rota nem consumidor |
| `DENY` | nenhuma | padrão para rota/método não inventariado |

`POST /api/auth/logout` permanece `LEGACY_OWNER`, pois o proxy exige sessão para alcançá-lo. `/login`, `/manifest.json`, `/icon.svg` e `/sw.js` são paths públicos exatos. Todos os demais paths alcançados pelo matcher são protegidos.

## Invariantes

- Nunca existe `LEGACY_OR_AUTH`.
- A chave do mapa é o par método + path; adicionar método a arquivo existente exige nova entrada.
- Rotas dinâmicas usam o padrão literal do App Router, por exemplo `/api/simulations/[id]`.
- A Fase 1 adicionará rotas sob `/v3`/`/api/v3` como `AUTH_V3` sem alterar as entradas V2.
- Antes de qualquer alteração de proxy, os testes devem provar: cookie legado não abre `AUTH_V3`; sessão Auth não abre `LEGACY_OWNER`; ausência de mapa nega acesso.
