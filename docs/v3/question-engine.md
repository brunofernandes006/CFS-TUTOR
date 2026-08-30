# CFS Tutor V3 — motor de questões

## Objetivo

Oferecer treino, recuperação, provas anteriores e simulados com filtros avançados, rastreabilidade integral e progresso individual. A mesma questão pode participar de diferentes sessões, mas sua validade e origem nunca mudam conforme o contexto.

## Tipos de sessão

| Tipo | Seleção | Feedback | Uso de desempenho |
|---|---|---|---|
| treino livre | filtros do aluno | imediato após confirmar | sim |
| questões relacionadas | item/unidade estudada | imediato | sim |
| recuperação | revisão ou erro | após tentativa | sim, com contexto de revisão |
| caderno | itens escolhidos pelo usuário | configurável | sim |
| prova anterior | composição histórica | somente conforme modo escolhido | separado do escopo corrente quando necessário |
| simulado oficial | distribuição vigente | somente ao finalizar | sim |
| simulado adaptativo | lacunas individuais | somente ao finalizar ou por configuração | sim |

## Filtros avançados

### Essenciais

- disciplina;
- item do edital e descendentes;
- quantidade;
- status: todas, não resolvidas, corretas, erradas;
- origem: real, interna validada;
- dificuldade;
- ordenação: prioridade, edital, recência, aleatória reproduzível.

### Avançados

- prova/ano;
- somente edital vigente;
- revisões vencidas;
- reincidência de erro;
- favoritas;
- caderno;
- com fonte visual disponível;
- intervalo de última tentativa;
- excluir vistas recentemente;
- tipo de alternativa, quando aplicável.

Filtros incompatíveis são desabilitados com explicação. Consultas são versionadas, validadas no servidor e podem ser salvas por usuário.

## Seleção de questões

O motor retorna uma sessão materializada, não uma query recalculada a cada navegação. Cada item registra posição, versão da questão e contexto de seleção.

Regras:

- questão real somente validada e com gabarito oficial;
- questão anulada entra apenas em experiências que tratem anulação explicitamente;
- questão histórica fora do edital atual é excluída por padrão;
- visual obrigatório precisa estar disponível;
- evitar duplicação e exposição repetida recente;
- seed persistida torna a ordem reproduzível;
- adaptativo registra motivos da seleção.

## Questões relacionadas

Relações podem ser:

- questão → item do edital;
- questão → unidade/bloco de conteúdo;
- questão → questão semelhante, pré-requisito ou contraste;

Relação automática é candidata. Publicação exige validação administrativa para vínculos que impactem conteúdo oficial ou domínio.

## Ciclo de resposta

```text
READY → SELECTED → SUBMITTING → CONFIRMED → FEEDBACK
                       └──────→ RETRYABLE_ERROR
```

- Selecionar alternativa é otimista e local.
- Confirmar gera comando idempotente.
- Correção, tentativa, progresso, revisão, erro, meta e XP são processados de forma atômica ou por eventos idempotentes.
- Feedback só aparece após confirmação do servidor.
- Erro pede classificação causal rápida, editável depois.

## Ferramentas durante a resolução

- eliminar alternativas localmente;
- ajustar fonte e modo foco;
- favoritar;
- adicionar a caderno;
- ver fonte e contexto permitido;
- reportar erro de conteúdo;
- navegar anterior/próxima;
- abrir cartão de questões;
- pausar/retomar quando o modo permitir.

Anotações privadas podem ser acrescentadas numa fase posterior dentro de cadernos; não fazem parte da questão global.

## Provas anteriores

- prova e gabarito formam um par validado;
- preservar ano, banca, número, disciplina, página, anulação e assets;
- oferecer modo aplicação e modo estudo;
- mostrar compatibilidade com edital vigente por questão/item;
- resultados históricos fora do escopo não contaminam prontidão corrente sem regra explícita;
- permitir gerar caderno ou sessão apenas com questões compatíveis.

## Simulados

### Oficial

Mantém distribuição, pesos, mínimos e composição vigentes. Pool insuficiente bloqueia criação com diagnóstico por disciplina.

### Adaptativo

Combina domínio, erros, revisão, incidência confiável e cobertura. Quantidade configurável dentro de limites. O resultado explica por que áreas foram selecionadas sem expor dados de outros usuários.

### Aplicação

- checkpoint remoto e local mínimo;
- cartão de respostas mobile;
- timer e regra de pausa;
- respostas confirmadas individualmente;
- conclusão idempotente;
- nenhuma correção durante modo prova;
- resultado por disciplina/item e fila de recuperação.

## Favoritos e cadernos

- Favorito é relação única usuário–alvo e pode apontar para questão ou conteúdo.
- Caderno é coleção nomeada, privada, ordenável, com descrição e itens heterogêneos controlados.
- Adicionar/remover favorito pode usar optimistic UI com rollback.
- Operação de caderno usa versão para evitar perda em múltiplas abas/dispositivos.

## Integridade

- attempts guardam snapshot mínimo de versão/gabarito necessário à auditoria;
- edição de questão publicada cria versão, não reescreve silenciosamente o passado;
- métricas ignoram tentativas inválidas, anuladas ou de conteúdo não elegível conforme regra documentada;
- reportes podem suspender uma questão de novas sessões sem apagar histórico;
- toda mutação usa `auth.uid()` derivado da sessão.

