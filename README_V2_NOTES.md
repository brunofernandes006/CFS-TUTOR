# CFS Tutor V2 — notas de migração

Esta branch não deve ser mesclada sem CI verde.

## Alterações principais

- Home estratégica mobile-first.
- Navegação primária reduzida.
- Cards touch-first sem hover obrigatório.
- Tailwind 4 com tokens definidos via `@theme`.
- PWA com service worker básico.
- Motor transparente de prioridade baseado nos pesos 50/30/20 e evidência do aluno.
- Central de upload e classificação de fontes.
- SHA-256 e deduplicação.
- Supabase Storage/PostgreSQL em produção com fallback local para desenvolvimento.
- Schema de documentos, relacionamentos e fontes de questões.
- Quality gate GitHub Actions: lint, testes e build.

## Antes do deploy em produção

1. Criar projeto Supabase.
2. Aplicar `supabase/migrations/001_source_ingestion.sql`.
3. Configurar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` como secrets do ambiente.
4. Validar bucket privado `cfs-fontes`.
5. Não expor a service role no cliente.
6. Migrar progressivamente o SQLite legado para PostgreSQL; até lá, rotas que dependem de `lib/db.ts` continuam locais.
7. Validar upload, duplicidade e classificação com PDFs reais antes de permitir ingestão automática de questões.

## Regra de fonte

Classificação automática organiza o arquivo, mas não transforma material em fonte oficial. Provas e gabaritos precisam de validação explícita; questões reais precisam manter fonte/página e gabarito oficial associado.
