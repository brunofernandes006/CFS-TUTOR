# Arquitetura CFS Tutor V2

```text
Cliente Web/PWA
   |
Next.js App Router
   |
API Routes
   |-- Study/Priority services
   |-- Question services
   |-- Source ingestion
   |
   +--> PostgreSQL (Supabase)
   +--> Private Object Storage (Supabase)
```

## Princípios

- UI não acessa service role.
- Arquivos de fonte ficam privados.
- Hash SHA-256 é chave de deduplicação.
- Metadados e arquivo são persistidos separadamente.
- Classificação automática não equivale a validação oficial.
- Questões reais mantêm rastreabilidade até documento/página/gabarito.
- APIs de progresso não devem ser cacheadas offline como verdade atual.
- Service worker prioriza shell; dados permanecem network-first.

## Migração do legado

`better-sqlite3` permanece temporariamente para rotas existentes. Novas capacidades devem depender de interfaces/serviços e PostgreSQL. A remoção do SQLite só ocorre após migração validada de progresso, tentativas, erros, revisões e simulados.
