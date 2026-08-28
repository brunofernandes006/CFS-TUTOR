# Sprint 0 — Status

## Concluído

- Branch isolada de reconstrução.
- Home mobile-first orientada ao plano de hoje.
- Navegação simplificada.
- Cards touch-first.
- Remoção da dependência visual de hover e sobreposição da home.
- Tailwind 4 alinhado com tokens via `@theme`.
- Zoom/acessibilidade mobile corrigidos.
- PWA com service worker básico.
- Pesos oficiais centralizados (50/30/20).
- Motor V2 de prioridade com regra explícita para dados insuficientes.
- Central de Fontes.
- Upload seguro com limite, MIME, sanitização e SHA-256.
- Deduplicação local/Supabase.
- Classificador determinístico e fila de revisão.
- Schema Supabase para documentos e relações prova/gabarito/normas.
- Testes para pesos/prioridade e classificação.
- CI com lint, testes e build.

## Pendências deliberadas

- Extração textual de PDF/DOCX ainda não é feita no endpoint. Nesta etapa, a classificação usa metadados/nome e não contamina o banco quando a confiança é insuficiente.
- OCR será assíncrono e somente para PDF image-only.
- SQLite legado ainda alimenta partes antigas do sistema. Migração para PostgreSQL será incremental para evitar perda de dados e regressão.
- Ingestão automática de questões só será liberada após parser + tela de validação prova/gabarito.
