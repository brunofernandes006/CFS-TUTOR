# CFS Tutor V2 — Missão Aprovação

Sistema de estudo estratégico para o **CFS / Sargento PMESP**, orientado pelo edital, provas anteriores, gabaritos oficiais e normas válidas.

> Ferramenta independente de estudos. Não oficial e sem vínculo com a Polícia Militar do Estado de São Paulo.

## Objetivo do produto

Reduzir decisão e aumentar rendimento. A tela principal deve responder: **o que estudar agora, por quê, por quanto tempo e qual é a próxima revisão**.

Pesos de referência do edital CFS/26:

- Conhecimentos Profissionais: **50% da nota ponderada**
- Língua Portuguesa: **30%**
- Matemática: **20%**

O motor de prioridade combina peso da disciplina, incidência medida em provas, domínio com evidência suficiente, erros recorrentes, revisão vencida e conteúdo ainda não estudado. Incidência histórica só entra no cálculo quando existir dado real extraído de provas cadastradas.

## Fluxo pedagógico

Diagnóstico → Recuperação ativa → Conteúdo essencial → Questão → Correção → Classificação do erro → Questão de confirmação → Revisão futura.

Revisões-base: **24 horas, 7 dias e 30 dias**, adaptadas conforme erro e retenção.

Questões reais somente podem ser validadas quando houver prova rastreável e gabarito oficial associado.

## Central de Fontes

A rota `/fontes` recebe provas, gabaritos, editais, legislação, ICC, diretrizes, notas de instrução, ordens de serviço, despachos, portarias, processos operacionais e materiais complementares.

Pipeline de ingestão:

1. validação de tipo, tamanho e assinatura do arquivo;
2. sanitização do nome;
3. SHA-256 e deduplicação;
4. classificação determinística;
5. destino lógico por categoria;
6. extração de texto quando suportada;
7. fila de validação humana quando necessária;
8. armazenamento privado no Supabase Storage;
9. metadados e rastreabilidade no PostgreSQL.

Classificações com confiança insuficiente ficam em `NEEDS_REVIEW` e **não alimentam automaticamente questões ou conteúdo de estudo**.

## Arquitetura V2

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- API Routes server-side
- Supabase PostgreSQL como banco definitivo
- Supabase Storage privado para documentos
- service role somente no servidor
- RLS habilitado nas tabelas públicas
- Jest para testes
- GitHub Actions para lint, testes e build
- PWA com service worker

A V2 não depende de banco SQLite externo nem de pasta local do Windows.

## Banco de dados

As migrations ficam em `supabase/migrations/` e definem:

- fontes e versões de documentos;
- disciplinas e árvore do edital;
- provas e gabaritos;
- questões com rastreabilidade;
- tentativas e caderno de erros;
- domínio e revisões;
- incidência histórica;
- sessões de estudo e simulados.

Pesos cadastrados no banco: **Profissionais 50%, Português 30%, Matemática 20%**.

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

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — somente servidor
- `SUPABASE_SOURCE_BUCKET`
- `CFS_DEFAULT_USER_ID`

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador, em variáveis `NEXT_PUBLIC_*` ou no repositório.

## Reconstrução

O desenvolvimento ocorre na branch `rebuild/cfs-tutor-v2` e é revisado pelo Pull Request #1. A `main` permanece preservada até o quality gate ficar verde e as funções críticas da V2 estarem validadas.

Consulte `PRODUCT_V2.md` e `docs/ARCHITECTURE_V2.md` para decisões de produto e arquitetura.
