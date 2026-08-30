# Matriz de funcionalidades

Legenda: **sim** = implementado/observado; **parcial** = existe, mas com escopo menor ou sem continuidade completa; **não observado** = não identificado na análise; **não recomendado** = não combina com o produto ou exige decisão explícita.

| Área | Referência | CFS Tutor | Lacuna / decisão |
|---|---|---|---|
| Navegação principal compacta | sim | sim | manter arquitetura atual de quatro áreas + Mais |
| Onboarding guiado | sim | não observado | tutorial curto e dispensável após a base estar pronta |
| Missão/plano diário | programas e orientação geral | sim, missão adaptativa de 45 min | fazer o CTA iniciar o tópico e medir conclusão |
| Árvore de estudo | programas por objetivo | sim, árvore fiel ao edital vigente | manter edital como autoridade; melhorar expansão e continuidade |
| Filtros hierárquicos | sim, múltiplas dimensões e busca | parcial | adicionar tópico, status, dificuldade e origem sem expor complexidade de início |
| Filtros salvos | sim | não | salvar consultas do próprio domínio, com esquema versionado |
| Ordenação | relevância/recência e variações | parcial, ordem definida no servidor | oferecer prioridade adaptativa, edital e recência como opções transparentes |
| Treino por quantidade | sim | não, fluxo unitário | criar sessões de 5/10/20 ou meta de tempo |
| Resposta imediata | sim | sim | preservar feedback após tentativa |
| Modos de confirmação | sim | não | preferências: confirmar sempre ou responder ao selecionar; padrão seguro é confirmar |
| Eliminação de alternativas | sim | não | boa melhoria local; não deve afetar a resposta persistida |
| Ajuste de fonte / tela de foco | sim | parcial via layout responsivo | preferências de leitura e modo foco são P2 |
| Navegação anterior/próxima | sim | sim no simulado; não no treino unitário | sessão de treino deve ganhar fila e mapa compacto |
| Mapa/cartão de respostas | sim | parcial, faixa horizontal numerada | adicionar legenda, saltos e agrupamento para 60 questões |
| Pausa e retomada | sim | parcial | persistir índice, tempo e rascunho; sinalizar o que já chegou ao servidor |
| Timer | sim | duração apenas como dado de simulado | cronômetro visível, pausável conforme regra do modo |
| Offline para questões | sim | não; PWA só guarda shell estático | implementar apenas após modelo de sincronização e segurança |
| Anotações por questão | sim | não observado | P2; dado próprio, sem copiar editor ou modelo da referência |
| Marcadores/coleções | sim | não observado | P2; coleção simples antes de taxonomia complexa |
| Comentários/comunidade | sim | não observado | não recomendado no curto prazo para produto pessoal |
| Explicações multimodais | sim | texto opcional | manter explicação rastreável; vídeo/IA somente com política própria |
| Reporte de problema | sim | validação acontece na Central de Fontes | botão contextual “reportar questão” pode alimentar fila de revisão |
| Classificação causal do erro | não confirmada no mesmo nível | sim, explícita e nunca silenciosa | diferencial do CFS; reduzir para escolha rápida e editável |
| Caderno de erros | recursos equivalentes dispersos | sim | criar ação de recuperação e estado resolvido |
| Revisão espaçada | revisão de questões observada | sim, política 24h/7d/30d adaptativa | manter política própria e expor próxima etapa de forma simples |
| Simulado oficial | sim, catálogo amplo | sim, distribuição e pesos do CFS | preservar fidelidade à prova e fontes oficiais |
| Simulado adaptativo | geração por filtros/objetivos | sim, 10–60 questões | permitir visualizar o critério sem revelar detalhes desnecessários |
| Resultado por disciplina | sim | sim | adicionar comparação temporal pessoal, não social |
| Resultado por tópico | sim | parcial, lista de erros e desempenho geral por tópico | drill-down com evidência mínima |
| Histórico de simulados | sim | sim | filtros de status/período e CTA de retomada |
| Desempenho por período | sim | parcial, últimos 30 dias fixos | presets 7/30/90/todo e intervalo acessível |
| Incidência de assuntos | sim | sim como sinal interno condicionado a múltiplas provas | exibir apenas quando confiável e explicar amostra |
| Ranking social | sim | não | não recomendado por padrão; conflita com uso pessoal e pode induzir comparação ruim |
| Gamificação por XP/nível | não confirmada nesta análise | tipos legados, não integrada | preferir consistência, conclusão de missão e marcos pedagógicos |
| Notificações | sim | não observado | lembretes de revisão opcionais e locais são P3 |
| Estados vazios/erro/loading | sim | sim | padronizar componentes e retry contextual |
| Cache de catálogos | sim | não; dados principais são `no-store` | cachear somente metadados seguros com invalidação explícita |
| Carregamento incremental | sim em listas amplas | não observado nas listas principais | necessário quando banco crescer |
| Fonte oficial rastreável | não avaliado | sim, forte | invariável do CFS; nenhuma adaptação pode enfraquecê-lo |

## O que não deve ser importado

- Escopo generalista de concursos, marketplace, planos, upsell ou comunidade.
- Terminologia, microcopy, identidade visual, ícones, ilustrações ou tutoriais da referência.
- Regras de relevância, ranking, permissões ou monetização.
- Qualquer estrutura inferida de API, armazenamento ou conteúdo.
- Gamificação competitiva sem hipótese pedagógica mensurável.

