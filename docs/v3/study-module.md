# CFS Tutor V3 — módulo Estudar

## Objetivo

Converter cada item ativo do edital em uma experiência de estudo com conteúdo real, fonte oficial, recuperação ativa e questões relacionadas. “Estudar” deixa de ser apenas uma lista de tópicos e passa a ser o núcleo pedagógico.

## Unidade de estudo

Um item do edital pode ter zero ou mais unidades de conteúdo. Cada unidade contém:

- título próprio e objetivo de aprendizagem;
- corpo estruturado em blocos autorais do CFS;
- natureza: oficial, explicativa ou complementar;
- vínculo ao item e versão do edital;
- uma ou mais fontes;
- referência de página, artigo, seção ou intervalo quando aplicável;
- status editorial: rascunho, em revisão, publicado, arquivado;
- versão, autor/revisor e datas de auditoria;
- estimativa de leitura e dificuldade;
- checkpoints de recuperação ativa;
- relações com questões e pré-requisitos.

Conteúdo oficial é uma apresentação própria e fiel, não uma cópia indiscriminada do documento. Trechos reproduzidos somente quando juridicamente permitido e necessários, sempre com citação e rastreabilidade.

## Estados do item do edital

```text
SEM_CONTEUDO → RASCUNHO → EM_REVISAO → PUBLICADO → ARQUIVADO
```

Para o aluno:

- não iniciado;
- em andamento;
- conteúdo concluído;
- recuperação pendente;
- praticado;
- revisão vencida;
- dominado com evidência suficiente.

“Concluído” e “dominado” são diferentes. Leitura concluída não declara domínio.

## Fluxo pedagógico

### 1. Preparação

- mostrar objetivo, tempo estimado, impacto na prova e pré-requisitos;
- indicar por que o item foi priorizado;
- permitir continuar checkpoint existente.

### 2. Conteúdo

- blocos curtos: conceito, regra, exceção, exemplo próprio, alerta e síntese;
- fonte visível por bloco ou seção;
- navegação sequencial, índice e progresso;
- favorito e inclusão em caderno;
- fonte oficial abre metadados e visualização autorizada sem perder o estado.

### 3. Recuperação ativa

Antes de mostrar a síntese final, solicitar uma ação sem consulta:

- recordar pontos-chave em campo livre;
- responder cartões próprios;
- ordenar passos ou classificar afirmações;
- responder questão curta vinculada ao objetivo.

O texto livre pode ser autoavaliado pelo aluno com rubrica. IA, se adicionada no futuro, oferece apoio e nunca cria prova de domínio sozinha.

### 4. Questões relacionadas

Fila de 3–10 questões, priorizada por:

1. vínculo explícito ao item;
2. validade no edital corrente;
3. origem e rastreabilidade;
4. variedade de prova/ano;
5. dificuldade adequada;
6. histórico do usuário e baixa exposição recente.

Se não houver questões suficientes, o sistema informa a lacuna e não substitui silenciosamente por conteúdo fora do escopo.

### 5. Fechamento

- resumo do que foi feito;
- recuperação declarada pelo aluno;
- acertos, erros e amostra;
- próxima revisão;
- progresso de meta;
- XP confirmado pelo servidor;
- recomendação seguinte.

## Fonte oficial vinculada

Toda unidade publicada deve ter pelo menos uma relação `content_source_link`. A relação identifica:

- documento validado;
- tipo da relação: base normativa, citação, apoio ou atualização;
- localização no documento;
- vigência no momento da publicação;
- nota editorial e verificador.

Quando a fonte é substituída ou expira, unidades dependentes entram em fila de revisão. Conteúdo continua acessível apenas se a política editorial permitir e sempre com alerta de vigência.

## Priorização

Pontuação própria da V3 combina peso da disciplina, item não estudado, revisão vencida, domínio com evidência, erro recorrente, incidência histórica confiável, proximidade da meta e dependências. O sistema retorna também motivos legíveis.

Não usar XP, tempo de tela ou sequência como sinal de domínio.

## Progresso individual

Registrar eventos e agregados separados:

- início, pausa, retomada e conclusão da sessão;
- checkpoint de bloco;
- recuperação realizada e autoavaliação;
- questões respondidas;
- tempo ativo limitado por regras anti-idle;
- revisão agendada;
- progresso agregado do item.

Eventos são append-only quando possível; agregados podem ser recalculados.

## Admin de conteúdo

O editor administrativo precisa:

- escolher item e versão do edital;
- montar blocos com schema restrito;
- anexar fontes já validadas;
- criar checkpoints e relações de questão;
- visualizar como aluno/mobile;
- enviar para revisão e publicar;
- comparar versões e arquivar;
- listar itens sem conteúdo, sem fonte ou sem questões.

## Critérios de aceite do módulo

- nenhum conteúdo oficial publicado sem fonte válida;
- reload e troca de dispositivo retomam o último checkpoint confirmado;
- recuperação ocorre antes da resposta/síntese quando configurada;
- questões relacionadas respeitam edital e rastreabilidade;
- conclusão atualiza progresso, revisão, meta e XP atomicamente ou por eventos idempotentes;
- o aluno distingue claramente leitura, prática e domínio.

