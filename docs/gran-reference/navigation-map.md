# Mapa de navegação

## Referência funcional

Mapa conceitual reconstruído a partir de superfícies observáveis; os nomes foram normalizados e não representam uma reprodução literal da arquitetura interna.

```text
Entrada
├── autenticação, recuperação e onboarding
└── área principal
    ├── painel de desempenho
    │   ├── resumo por período
    │   ├── desempenho por disciplina
    │   ├── provas e simulados recentes
    │   └── atalhos para análise detalhada
    ├── questões
    │   ├── filtros hierárquicos
    │   ├── filtros salvos
    │   ├── resultado do filtro
    │   └── resolução
    │       ├── navegação entre questões
    │       ├── resposta e feedback
    │       ├── comentário/explicação
    │       ├── anotação e marcador
    │       ├── estatística da questão
    │       └── revisão/finalização
    ├── simulados
    │   ├── descoberta e filtros
    │   ├── detalhes
    │   ├── aplicação e cartão-resposta
    │   ├── resultado por disciplina/assunto
    │   └── histórico e retomada
    ├── programas de estudo
    │   ├── por objetivo/instituição/carreira
    │   └── detalhes e progresso
    └── menu complementar
        ├── marcadores e anotações
        ├── downloads/offline
        ├── análises de incidência
        ├── rankings
        ├── perfil e preferências
        └── ajuda/tutorial
```

Padrão predominante: poucas áreas de primeiro nível e profundidade contextual. Recursos secundários aparecem no menu lateral ou dentro da própria sessão, reduzindo idas e voltas ao painel.

## CFS Tutor atual

```text
Login
└── Hoje (/)
    ├── Estudar (/estudar)
    ├── Questões (/questoes)
    ├── Desempenho (/desempenho)
    └── Mais
        ├── Revisão (/revisao)
        │   └── Questões por tópico (/questoes?syllabusItemId=...)
        ├── Simulados (/simulados)
        │   ├── Aplicação (/simulados/:id)
        │   └── Resultado (/simulados/:id/resultado)
        ├── Caderno de Erros (/caderno)
        ├── Central de Fontes (/fontes)
        │   └── Edital (/fontes/edital)
        └── Sair
```

No desktop, Hoje, Estudar, Questões e Desempenho ficam no topo. No mobile, as quatro áreas mais “Mais” formam a barra inferior fixa; o menu complementar abre como painel lateral.

## Comparação dos fluxos principais

| Intenção | Referência | CFS Tutor atual | Oportunidade clean-room |
|---|---|---|---|
| Começar rapidamente | painel e programas conduzem a listas preparadas | missão do dia leva a Estudar, mas o tópico ainda não inicia uma sessão diretamente | CTA da missão deve abrir uma sessão já contextualizada |
| Montar treino | filtros amplos, hierárquicos e salváveis | matéria ou tópico; uma questão por vez | construtor em duas camadas: filtros essenciais e avançados |
| Resolver | ambiente rico, com ações contextuais e modos de resposta | treino simples com feedback imediato; simulado com confirmação e mapa horizontal | manter simplicidade, acrescentar barra contextual e preferências próprias |
| Retomar | histórico, progresso e estado local/remoto | simulado retoma respostas já salvas no servidor; índice e seleção local não persistem | ponto de retomada explícito e rascunho local seguro |
| Revisar erro | histórico, revisão e recursos auxiliares | revisão agenda tópico; caderno registra causa e reincidência | ligar diretamente erro → recuperação → nova evidência |
| Explorar desempenho | período, disciplina, assunto e atividade recente | visão global, por matéria, tópicos críticos/fortes e 30 dias | filtros por período e drill-down sem perder contexto |
| Administrar conteúdo | não é fluxo central de estudo | Central de Fontes está no menu do estudante | separar “estudo” de “administração de fontes” quando houver perfis |

## Princípios de navegação recomendados

- Preservar as quatro áreas primárias atuais; elas correspondem bem ao ciclo planejar → estudar → praticar → medir.
- Fazer Revisão e Caderno convergirem para uma mesma sessão de recuperação, mantendo suas entradas distintas.
- Tratar Central de Fontes como ferramenta administrativa, não como destino cotidiano de estudo.
- Representar filtros no URL quando não forem sensíveis, permitindo voltar, compartilhar entre dispositivos próprios e restaurar estado.
- Evitar novas áreas de primeiro nível para cada recurso auxiliar; anotações, fonte, explicação e classificação devem viver no contexto da questão.
- No mobile, garantir que toda ação crítica esteja acima da barra inferior e da safe area.

