# CFS Tutor V2 — Product/Engineering Baseline

## Objetivo

Maximizar retenção e desempenho no CFS PMESP com uma experiência mobile-first que reduza decisões e priorize o que mais impacta a nota.

## Pesos oficiais usados pelo motor estratégico

- Conhecimentos Profissionais: 20 questões, peso 5, 50% da nota ponderada.
- Língua Portuguesa: 20 questões, peso 3, 30% da nota ponderada.
- Matemática: 20 questões, peso 2, 20% da nota ponderada.

Peso da disciplina não substitui desempenho individual. O plano é adaptativo e considera evidência de domínio, erros recorrentes, revisões vencidas, incidência medida em provas e conteúdo ainda não estudado.

## Fluxo pedagógico padrão

Diagnóstico → recuperação ativa → conteúdo essencial → questão → correção → classificação do erro → questão de confirmação → revisão futura.

Revisões base: 24h, 7d e 30d. Erro recorrente encurta intervalo. Domínio consistente amplia intervalo.

## Princípios de UX

1. Mobile-first.
2. Uma ação principal por tela.
3. Home responde “o que estudar agora?”.
4. Sem hover obrigatório para ações.
5. Sem sobreposição de blocos.
6. Navegação primária limitada a Hoje, Estudar, Questões, Desempenho e Mais.
7. Dados insuficientes nunca são apresentados como domínio confirmado.

## Fontes e ingestão

Pipeline: upload → validação MIME/tamanho → SHA-256 → deduplicação → classificação determinística → armazenamento → revisão quando necessária → associação a edital/prova/gabarito → uso pedagógico.

Categorias: EDITAL, PROVA, GABARITO, LEGISLACAO, DIREITOS_HUMANOS, NORMA_PMESP, DIRETRIZ, NOTA_DE_INSTRUCAO, ORDEM_DE_SERVICO, DESPACHO, PORTARIA, ICC, PROCESSO_OPERACIONAL, APOSTILA, OUTRO.

### Regras de integridade

- Questão real exige documento-fonte identificável.
- Gabarito oficial exige documento-fonte oficial validado.
- O sistema nunca infere resposta e grava como gabarito oficial.
- Classificação de baixa confiança fica em NEEDS_REVIEW.
- Documento duplicado é detectado por SHA-256.
- Norma deve controlar versão, vigência e corte temporal do edital antes de ser usada como fonte prioritária.

## Persistência

### Produção

Supabase PostgreSQL + Supabase Storage privado.

Variáveis:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SOURCE_BUCKET` (opcional; padrão `cfs-fontes`)

Aplicar `supabase/migrations/001_source_ingestion.sql` antes de ativar o upload em produção.

### Desenvolvimento local

Sem Supabase configurado, o endpoint de upload usa `.data/sources` como fallback local. Essa pasta não deve ser versionada.

## Roadmap técnico

### Sprint 0 — estabilização
- Tailwind 4 com tokens carregados corretamente.
- Home mobile-first.
- Navegação primária reduzida.
- Cards sem hover obrigatório.
- Zoom do navegador permitido.

### Sprint 1 — dados
- Abstrair SQLite legado.
- Migrar progresso, erros, revisões e questões para PostgreSQL.
- Preservar testes de regras pedagógicas.

### Sprint 2 — ingestão
- Upload seguro.
- SHA-256 e deduplicação.
- Classificação determinística.
- Fila de revisão.
- Armazenamento privado.
- Extração textual assíncrona e OCR apenas quando necessário.

### Sprint 3 — inteligência pedagógica
- Prioridade transparente.
- Revisões 24h/7d/30d adaptativas.
- Caderno de erros recorrentes.
- Evidência mínima para domínio.

### Sprint 4 — provas e simulados
- Vincular prova e gabarito por concurso/ano/banca.
- Questões reais com página e fonte.
- Simulado oficial e adaptativo.

### Sprint 5 — PWA e entrega
- Service worker.
- Cache seletivo.
- CI: lint + testes + build.
- Deploy controlado.

## Definition of Done

Uma funcionalidade só está concluída quando: compila, possui estado de erro/loading, é utilizável em 360px, não depende de hover, tem regra de dados definida e não apresenta informação não validada como oficial.
