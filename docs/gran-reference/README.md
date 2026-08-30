# Referência funcional clean-room

## Objetivo

Este diretório compara o CFS Tutor com o artefato disponível em `C:\GranReverse` exclusivamente como referência de comportamento, organização de fluxos e UX. O resultado deve orientar decisões próprias do CFS Tutor, sem reproduzir implementação, identidade visual, textos extensos, mídia, conteúdo editorial, credenciais, contratos de API ou infraestrutura de terceiros.

O caminho de CFS Tutor informado originalmente, `C:\Users\bruno\OneDrive\Documents\CFS - ESTUDOS - NOVO\01_CFS_TUTOR`, não existe no ambiente analisado. A comparação usou o repositório correspondente encontrado em `C:\Users\bruno\OneDrive\Documents\CFS - TUTOR\01_CFS_TUTOR`.

## Método e limites

- Referência: observação estática de um aplicativo Flutter/Android desmontado, limitada a nomes funcionais, estados de interface e padrões de interação.
- CFS Tutor: leitura do código, documentação, testes e migrações existentes.
- Não houve acesso, chamada ou documentação de serviços privados da referência.
- Não foram copiados código, assets, textos editoriais, modelos de dados, identificadores internos ou conteúdo de questões.
- A análise não afirma equivalência visual nem valida execução em aparelho real.
- “Confirmado” significa evidência estrutural explícita; “inferido” significa evidência indireta que ainda exige teste de uso; “não observado” não significa necessariamente inexistente.

## Documentos

1. [Mapa de navegação](./navigation-map.md)
2. [Matriz de funcionalidades](./feature-matrix.md)
3. [Diferenças arquiteturais](./architecture-differences.md)
4. [Fluidez, estado e mobile](./fluidity-state-mobile.md)
5. [Plano de adaptação clean-room](./clean-room-adaptation-plan.md)

## Síntese executiva

O melhor caminho não é transformar o CFS Tutor em uma cópia de uma plataforma generalista. A referência demonstra padrões maduros para reduzir atrito: filtros progressivos e salváveis, retomada de sessões, navegação contextual dentro da questão, cache de catálogos, carregamento incremental, feedback de conectividade e ações auxiliares sem abandonar a resolução.

O CFS Tutor já possui diferenciais mais adequados ao seu objetivo: edital vigente como limite de escopo, fonte e gabarito rastreáveis, recusa de métricas sem evidência, caderno de erros causal, revisão adaptativa e simulado alinhado à prova do CFS. A adaptação recomendada preserva esses invariantes e importa apenas padrões genéricos de interação.

Prioridades sugeridas:

1. Continuidade confiável de treino e simulado, com retomada explícita e reconciliação.
2. Filtros de questões mais expressivos, serializáveis e reutilizáveis.
3. Barra contextual de resolução e mapa de questões com estados claros.
4. Cache seguro de metadados públicos/estáveis e paginação incremental.
5. Desempenho explorável por disciplina, tópico e período.
6. Engajamento privado e orientado a consistência, sem ranking social como padrão.

