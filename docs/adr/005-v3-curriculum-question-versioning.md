# ADR 005 — Versionamento de edital, questão e fatos históricos

- **Status:** aceito para a especificação V3
- **Data:** 30/08/2026

## Decisão

- `syllabus_items` representa o conceito estável do tópico.
- `syllabus_versions` representa cada edital.
- `syllabus_version_items` representa pertencimento, ordem, título vigente, status e escopo de um conceito em uma versão. A unicidade é `(syllabus_version_id, syllabus_item_id)` e o código estável continua no conceito.
- Progresso não é clonado ao publicar edital; métricas por versão usam a associação e regras de elegibilidade.
- Sessões e simulados gravam `syllabus_version_id` imutável no início.

Para questões:

- cada questão V2 recebe uma única versão-baseline com hash;
- `question_version_id` entra nulo nas tabelas históricas, é preenchido idempotentemente, passa a ser escrito por novas operações e só depois vira obrigatório;
- tentativas e itens de simulado nunca são recalculados pela versão corrente;
- edição publicada cria nova versão; histórico mantém a apresentada e a resposta oficial usada.

## Backfill

1. criar versão de edital V2 e associações para todos os itens atuais;
2. criar versão-baseline para cada questão e resposta privada correspondente;
3. preencher sessões, attempts e simulation items por lotes reexecutáveis;
4. reconciliar contagens/hashes e verificar zero órfãos;
5. aplicar FKs/NOT NULL somente para novas linhas e, posteriormente, para o histórico confirmado;
6. nunca remover constraint antiga antes de a nova unicidade estar validada.

## Consequências

O catálogo mantém identidade estável, enquanto escopo e fatos apresentados permanecem reproduzíveis ao longo de editais e edições.

