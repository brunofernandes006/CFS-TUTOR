# CFS Tutor V3 — navegação

## Princípios

- O aluno sempre sabe qual é a próxima ação útil.
- Áreas primárias permanecem poucas; capacidades secundárias aparecem no contexto ou em “Mais”.
- Estado navegável fica no URL e sobrevive a reload, voltar/avançar e deep link.
- Admin e aluno usam shells separados.
- Toda rota protegida restaura destino após login.

## Mapa de informação

```text
Público
├── /login
├── /cadastro
├── /recuperar-senha
├── /atualizar-senha
└── /auth/confirmar

Aluno autenticado
├── /                         Hoje
├── /estudar                  Árvore e prioridade
│   ├── /estudar/[itemId]     Conteúdo do item
│   └── /estudar/sessao/[id]  Sessão guiada
├── /questoes                 Filtros e sessões
│   ├── /questoes/sessao/[id]
│   └── /questoes/[id]        Detalhe contextual
├── /desempenho               Resumo e drill-down
│   ├── /desempenho/disciplinas/[id]
│   └── /desempenho/topicos/[id]
├── /revisao                  Agenda
├── /erros                    Caderno de erros
├── /simulados
│   ├── /simulados/[id]
│   └── /simulados/[id]/resultado
├── /provas-anteriores
│   └── /provas-anteriores/[id]
├── /favoritos
├── /cadernos
│   └── /cadernos/[id]
├── /metas
├── /conquistas
└── /perfil
    ├── /preferencias
    └── /seguranca

Admin
└── /admin
    ├── /fontes
    ├── /editais
    ├── /conteudos
    ├── /provas
    ├── /questoes
    ├── /reportes
    ├── /usuarios
    └── /auditoria
```

## Navegação mobile-first

Barra inferior do aluno:

1. Hoje
2. Estudar
3. Questões
4. Desempenho
5. Mais

“Mais” abre bottom sheet ou drawer com Revisão, Erros, Simulados, Provas anteriores, Favoritos, Cadernos, Metas, Conquistas e Perfil. Badge pode indicar revisões vencidas; nunca usar múltiplos badges competitivos.

No desktop, as quatro áreas aparecem no topo; “Mais” vira menu. Admin usa sidebar própria e nunca ocupa a barra mobile do aluno.

## Fluxos

### Hoje → sessão útil

```text
Hoje → missão do dia → item do edital → conteúdo → recuperação ativa
     → questões relacionadas → resumo → XP/meta/progresso
```

O CTA da missão aponta para um item ou sessão concreta, não para uma lista genérica.

### Estudar

```text
Estudar → filtro/árvore → item → continuar de onde parou
        → conteúdo → recuperação → questões → conclusão
```

### Questões

```text
Questões → filtros essenciais → filtros avançados → prévia da sessão
         → resolver → feedback/classificação → resumo
         → salvar filtro / favoritar / adicionar a caderno
```

### Revisão e Erros

Ambas convergem na sessão de recuperação, mas preservam contexto:

- Revisão: retenção programada por item.
- Erros: questão e causa específica, reincidência e resolução.

### Provas anteriores e simulados

- Prova anterior mantém composição, origem e status histórico.
- Simulado oficial usa regras atuais do edital.
- Simulado adaptativo usa lacunas individuais e filtros permitidos.
- Aplicação usa o mesmo shell de prova, com políticas de feedback diferentes.

## Estado no URL

Parâmetros permitidos e validados:

- `disciplina`, `item`, `origem`, `status`, `dificuldade`;
- `ano`, `prova`, `ordenacao`, `periodo`;
- `pagina` ou cursor opaco;
- `caderno` e `favorito`, quando pertencem ao usuário.

Seleções de resposta, tokens, identidade, reportes e dados sensíveis nunca vão para o URL.

## Shell de resolução

- Cabeçalho: contexto, progresso, timer opcional e sincronização.
- Conteúdo central: enunciado/conteúdo e alternativas.
- Barra contextual: anterior, confirmar, próxima.
- Ações secundárias: favorito, caderno, fonte, reporte, tamanho da fonte.
- Cartão de questões: bottom sheet no mobile, painel no desktop.

Voltar do detalhe da fonte, favorito ou caderno preserva questão, scroll e seleção.

## Acessibilidade

- alvos de 44 px ou mais;
- foco preso e restaurado em drawers/modais;
- `aria-current` nas áreas e anúncio de status de salvamento;
- nenhuma informação depende apenas de cor;
- zoom 200%, teclado virtual, safe area e movimento reduzido;
- atalho “pular para conteúdo” e headings hierárquicos;
- confirmação explícita antes de abandonar sessão com rascunho.

