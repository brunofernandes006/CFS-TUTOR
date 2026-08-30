# Fluidez, persistência de estado e mobile

## Mecanismos observados na referência

Com alta confiança:

- skeletons e estados vazios especializados;
- cache em memória e persistente para metadados de filtro;
- carregamento incremental em listas extensas;
- detecção de conectividade e política de retry;
- download de conjuntos para estudo offline;
- fila de respostas pendentes e sincronização posterior;
- salvamento periódico de progresso de prova;
- janela/cache de páginas ao navegar entre questões;
- pausa/retomada de simulado temporizado;
- filtros salvos e reaplicáveis;
- tutorial contextual, menus de ação e feedback por snackbar/modal.

Esses itens são padrões genéricos de produto. A recomendação é reproduzir o resultado de UX por uma implementação própria, adequada à web, e não a estrutura técnica observada.

## Estado atual do CFS Tutor

| Estado | Onde vive | Sobrevive a reload? | Observação |
|---|---|---:|---|
| sessão autenticada | cookie HttpOnly | sim | adequado |
| tentativas e respostas confirmadas | PostgreSQL | sim | fonte de verdade |
| simulado criado e respostas confirmadas | PostgreSQL | sim | permite reabrir o simulado |
| índice atual do simulado | componente React | não | volta ao início visual após reload |
| alternativa selecionada ainda não confirmada | componente React | não | pode ser perdida |
| filtro de Questões por tópico | URL | sim | bom padrão, ainda restrito |
| filtro por disciplina em Questões | componente React | não | não é restaurado nem compartilhável |
| filtro de Estudar | componente React | não | reload volta a “Todos” |
| filtro do Caderno | componente React | não | reload perde seleção |
| dados de leitura | fetch `no-store` | não | consistente, mas sem stale-while-revalidate em memória |
| shell e assets públicos | Cache Storage | sim | service worker deliberadamente limitado |

## Modelo de persistência recomendado

### 1. URL: estado navegável

Usar para disciplina, tópico, status, origem, dificuldade, ordenação, período e página/cursor. Benefícios: voltar/avançar corretos, restauração após reload e links internos reproduzíveis.

### 2. Memória: dados derivados e cache de leitura

Manter respostas de catálogos e páginas recentes por poucos minutos, com revalidação ao focar/reconectar. Não persistir dados privados no Cache Storage. Exibir dado anterior com indicador de atualização em vez de apagar toda a tela.

### 3. Armazenamento local mínimo: preferência e rascunho

Adequado para tamanho da fonte, modo de confirmação, filtros nomeados, última posição e alternativa ainda não enviada. Cada registro precisa de `schemaVersion`, `updatedAt`, `userScope`, `entityId` e `serverVersion`. Limpar no logout.

### 4. Servidor: verdade pedagógica

Tentativa, resposta confirmada, classificação do erro, revisão, duração efetiva e conclusão continuam no PostgreSQL. A interface diferencia “selecionada”, “enviando”, “salva” e “falhou”.

## Máquina de estados da resolução

```text
carregando
  → pronta
      → selecionada
          → enviando
              → salva
              → falha_recuperável → enviando
      → offline_com_rascunho → reconciliando → salva
  → indisponível
```

O simulado pode navegar com uma seleção em rascunho, mas deve mostrar claramente se ela não foi confirmada. Ao finalizar, o sistema bloqueia e lista pendências reais e rascunhos não sincronizados.

## Fluidez recomendada por fluxo

### Questões

- Pré-carregar apenas metadados da próxima questão após a atual ficar pronta.
- Manter a altura do card estável entre loading, enunciado e feedback.
- Dar feedback otimista somente para seleção visual; correção e persistência esperam o servidor.
- Voltar da explicação/anotação sem perder scroll e estado da questão.
- Separar filtros essenciais dos avançados e mostrar chips ativos removíveis.

### Simulados

- Restaurar última questão visitada.
- Fazer checkpoint após resposta confirmada, troca de questão e evento de saída.
- Usar grade/cartão de respostas em bottom sheet no mobile; a faixa horizontal pode permanecer como atalho.
- Exibir cronômetro e estado de sincronização sem ocupar a área do enunciado.
- Não buscar o simulado inteiro após cada resposta; atualizar localmente a confirmação e revalidar em pontos definidos.

### Desempenho e Estudar

- Carregar resumo primeiro e detalhes depois.
- Paginar tópicos quando a árvore crescer.
- Preservar filtros no URL.
- Permitir drill-down por disciplina/tópico sem perder período e ordenação.

## Mobile

O CFS Tutor já possui bons fundamentos: barra inferior fixa, safe area, alvos mínimos de 44 px, chips horizontais, bottom sheets em componentes modais, layouts 1→2→3 colunas, foco visível e respeito a movimento reduzido.

Riscos atuais:

- menus e modal de finalização não declaram gestão completa de foco/teclado;
- cinco itens na barra inferior competem com conteúdo em telas pequenas;
- chips horizontais não indicam sempre que há mais opções fora da tela;
- o mapa de 60 questões em faixa horizontal exige muita rolagem;
- a Central de Fontes é densa para uso em telefone;
- `100vh` pode variar com barras do navegador; preferir unidades de viewport dinâmicas onde necessário;
- falta teste explícito de rotação, teclado virtual, zoom de texto e reconexão.

Checklist de validação futura: 360×640, 390×844, 412×915, 768×1024 e 1280×800; zoom 200%; teclado aberto; orientação horizontal; rede lenta; offline/reconexão; safe area; leitor de tela; `prefers-reduced-motion`.

