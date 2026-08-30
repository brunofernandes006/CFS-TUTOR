# Plano de adaptação clean-room

## Princípios

1. Especificar problemas e resultados desejados sem usar código ou materiais da referência.
2. Preservar os invariantes do CFS: edital vigente, fonte oficial, gabarito rastreável, evidência mínima e erro explicitamente classificado.
3. Criar contratos, nomes, componentes e microcopy próprios.
4. Implementar em incrementos reversíveis, com telemetria própria e testes de comportamento.
5. Não alterar banco até que os contratos de experiência e sincronização sejam aprovados.

## Artefatos de separação clean-room

Antes de implementação, criar para cada capacidade:

- uma declaração do problema observável;
- critérios de aceite independentes;
- wireflow próprio do CFS;
- contrato de estado e falhas;
- decisão sobre privacidade/cache;
- teste de comportamento sem referência a nomes, telas ou textos de terceiros.

O presente diretório é a especificação de requisitos comparativa. Ele não deve receber dumps, screenshots, strings extraídas, respostas de serviços, assets ou pseudocódigo derivado da referência.

## Fase 0 — baseline e decisões

Sem código ou banco:

- validar os fluxos atuais em 360/390/768/1280 px;
- medir tempo até primeira ação, latência de próxima questão e taxa de retomada de simulado;
- definir se o produto permanece estritamente pessoal ou ganhará perfis;
- decidir quais filtros são necessários para o corpus CFS, sem importar dimensões generalistas;
- escrever ADR para cache de leitura, rascunho local e idempotência;
- definir glossário próprio: sessão, treino, recuperação, revisão, simulado e evidência.

Saída: wireflows, contratos e métricas aprovados.

## Fase 1 — continuidade sem schema novo

- Serializar filtros de Estudar, Questões, Caderno e Desempenho no URL.
- Restaurar índice do simulado e preferências de leitura em armazenamento local versionado.
- Padronizar estados de carregamento, retry e reconexão.
- Consolidar TopNav/AppShell, incluindo foco do menu, feedback global e conectividade.
- Introduzir um controlador/hook de sessão de resolução testável.

Critérios de aceite:

- reload conserva filtro e posição;
- logout remove dados locais do usuário;
- nenhuma resposta é exibida como salva antes da confirmação remota;
- voltar/avançar do navegador restaura a consulta.

## Fase 2 — filtros e sessões de treino

- Definir `QuestionQueryV1` próprio: disciplina, tópico, estado de resolução, origem validada, dificuldade, ordenação e quantidade.
- Criar filtros essenciais + painel avançado, chips ativos e contagem de resultados.
- Permitir filtros nomeados locais; sincronização no servidor fica para uma necessidade futura comprovada.
- Criar sessão de treino com fila, anterior/próxima, mapa compacto e progresso.
- Adicionar eliminação local de alternativas e modo de confirmação como preferências.

Possível impacto de banco: nenhum para filtros locais; sessão durável no servidor deve ser proposta em migração separada.

## Fase 3 — simulado resiliente

- Especificar checkpoint com versão do simulado, posição, tempo e rascunhos.
- Tornar envio de resposta idempotente.
- Implementar cartão de respostas mobile e estado de sincronização.
- Adicionar cronômetro com regra explícita de pausa.
- Bloquear finalização enquanto houver mutações pendentes; oferecer recuperação clara.

Possível impacto de banco: versão/checkpoint e chaves de idempotência. Não implementar sem revisão de migração, backup e testes de concorrência.

## Fase 4 — fluidez e escala

- Cache em memória com revalidação para home, desempenho e catálogos.
- Cursor/paginação para questões, tópicos, caderno e histórico.
- Prefetch limitado e cancelamento de requests obsoletos.
- Observabilidade de latência, retry, abandono e falhas de reconciliação.
- Orçamento: interação local <100 ms; feedback de rede <300 ms; skeleton específico após atraso perceptível; nenhuma lista sem limite.

## Fase 5 — recuperação e desempenho explorável

- Unificar entrada de Revisão e Caderno numa sessão de recuperação, preservando a causa do erro.
- Permitir drill-down por período → disciplina → tópico → tentativas.
- Exibir tamanho da amostra e impedir interpretações fortes com pouca evidência.
- Criar comparação temporal apenas com o próprio usuário.
- Adicionar ação de reportar problema da questão para revisão interna.

## Fase 6 — engajamento opcional

Priorizar:

- missão concluída;
- sequência de dias estudados com regra tolerante;
- marcos de cobertura e revisão em dia;
- lembretes locais opcionais.

Evitar inicialmente:

- ranking social;
- XP sem vínculo pedagógico;
- recompensas por volume bruto de respostas;
- streak punitiva que incentive respostas apressadas.

## Backlog priorizado

| Prioridade | Entrega | Valor | Risco |
|---|---|---|---|
| P0 | URL state + retomada de posição | reduz perda de contexto imediatamente | baixo |
| P0 | estados de sincronização e retry | evita falsa confiança | médio |
| P1 | sessão de treino com fila | melhora prática deliberada | médio |
| P1 | filtros próprios e salvos | reduz trabalho repetido | médio |
| P1 | cartão de respostas mobile | melhora prova de 60 itens | baixo |
| P1 | drill-down de desempenho | transforma métrica em ação | médio |
| P2 | cache em memória e paginação | melhora escala e percepção | médio |
| P2 | anotações e marcadores | aumenta continuidade | médio |
| P2 | offline com reconciliação | útil, mas complexo e sensível | alto |
| P3 | gamificação privada | engajamento | baixo/médio |

## Critério de conclusão clean-room

Uma entrega é aceitável quando:

- sua especificação faz sentido sem acesso à referência;
- nomes, UI, textos, dados e implementação são próprios;
- há testes de estado feliz, rede lenta, falha, retry, reload e mobile;
- nenhuma credencial, domínio, rota privada, asset ou conteúdo da referência entrou no repositório;
- a rastreabilidade e as regras pedagógicas do CFS permanecem intactas.

