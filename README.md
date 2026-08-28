# CFS Tutor V2 — Missão Aprovação

Sistema de estudo estratégico para o **CFS / Sargento PMESP**, orientado pelo edital, provas anteriores, gabaritos oficiais e normas válidas.

> Ferramenta independente de estudos. Não oficial e sem vínculo com a Polícia Militar do Estado de São Paulo.

## Objetivo do produto

Reduzir decisão e aumentar rendimento. A tela principal deve responder: **o que estudar agora, por quê, por quanto tempo e qual é a próxima revisão**.

Pesos de referência do edital CFS/26:

- Conhecimentos Profissionais: **50% da nota ponderada**
- Língua Portuguesa: **30%**
- Matemática: **20%**

O motor de prioridade combina peso da disciplina, incidência medida em provas, domínio com evidência suficiente, erros recorrentes, revisão vencida e conteúdo ainda não estudado.

## Fluxo pedagógico

Diagnóstico → Recuperação ativa → Conteúdo essencial → Questão → Correção → Classificação do erro → Questão de confirmação → Revisão futura.

Revisões-base: **24 horas, 7 dias e 30 dias**, adaptadas conforme erro e retenção.

Questões reais somente podem ser marcadas como oficiais quando houver fonte rastreável e gabarito oficial validado.

## Central de Fontes

A rota `/fontes` permite enviar provas, gabaritos, editais, legislação, ICC, diretrizes, notas de instrução, ordens de serviço, despachos, portarias, processos operacionais e materiais complementares.

Pipeline de ingestão:

1. validação de tipo e tamanho;
2. nome sanitizado;
3. SHA-256 e deduplicação;
4. classificação determinística;
5. destino lógico por categoria;
6. status de validação;
7. armazenamento local no desenvolvimento ou Supabase Storage em produção;
8. metadados no PostgreSQL para rastreabilidade.

Classificações com confiança insuficiente ficam em `NEEDS_REVIEW` e **não alimentam automaticamente o banco de estudo**.

## Arquitetura

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- API Routes server-side
- Supabase PostgreSQL + Storage privado para produção
- SQLite legado temporário durante a migração
- Jest para testes
- GitHub Actions para lint, testes e build
- PWA com service worker básico

## Desenvolvimento

Requisito: **Node.js 22+**.

```bash
npm ci
npm run dev
```

Qualidade:

```bash
npm run lint
npm run test:ci
npm run build
```

## Variáveis de ambiente

Copie `.env.example` e configure, quando usar Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — somente servidor
- `SUPABASE_SOURCE_BUCKET`

Nunca exponha a service role no cliente.

## Migração V2

A reconstrução está sendo feita na branch `rebuild/cfs-tutor-v2` e revisada pelo Pull Request #1. A `main` permanece preservada até a validação do CI e das funções críticas.

Consulte `PRODUCT_V2.md` para decisões de produto e arquitetura.
