# Product Backlog V2

## P0 — segurança e funcionamento
- CI verde em lint/test/build.
- Corrigir qualquer regressão de TypeScript.
- Validar upload local e Supabase.
- Validar classificação com amostra real de provas/gabaritos/normas.
- Não permitir uso pedagógico de fonte `NEEDS_REVIEW`.

## P1 — migração de dados
- Criar repositórios/interfaces para progresso, questões, revisões e erros.
- Migrar SQLite para PostgreSQL sem perda.
- Criar script de migração idempotente.
- Backup antes/depois e relatório de contagem.

## P1 — ingestão de conteúdo
- Extrator PDF text-layer.
- Detector image-only.
- OCR assíncrono apenas quando necessário.
- Parser de prova.
- Parser de gabarito.
- Tela de validação prova ↔ gabarito.
- Extração de página/fonte por questão.

## P1 — estratégia pedagógica
- Substituir prioridade antiga pelo motor V2 após testes de regressão.
- Revisões base 24h/7d/30d adaptativas.
- Erro recorrente aumenta prioridade.
- Dados insuficientes bloqueiam rótulo de domínio forte.

## P2 — UX
- Unificar integralmente AppShell e TopNav.
- Redesenhar Estudar, Questões e Simulados para uma ação principal por tela.
- Remover carrosséis restantes onde não agregam valor.
- Validar 360/390/768/1280 px.

## P2 — PWA
- Página offline dedicada.
- Estratégia de cache versionada.
- Persistência local de sessão em andamento com reconciliação.

## P3 — inteligência opcional
- IA só para explicação/apoio, nunca para fabricar fonte oficial.
- Classificação semântica como segunda camada após regras determinísticas.
- Auditoria humana obrigatória para itens de baixa confiança.
