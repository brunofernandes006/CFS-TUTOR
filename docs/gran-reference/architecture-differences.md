# Diferenças arquiteturais

## Visão comparativa

| Eixo | Referência observada | CFS Tutor atual | Consequência |
|---|---|---|---|
| Cliente | aplicativo Flutter/Android | Next.js 16 + React 19, PWA | CFS precisa tratar ciclo de vida do navegador e múltiplas abas, não replicar padrões nativos literalmente |
| Organização | módulos por domínio, controladores e bindings | App Router, páginas cliente, rotas de API e serviços TypeScript | extraia estado de sessão para hooks/serviços próprios antes de enriquecer telas |
| Backend | cliente REST remoto com interceptadores | Backend-for-frontend em API Routes → Supabase REST/RPC | validação, segurança e idempotência devem permanecer no servidor |
| Persistência principal | servidor + banco local para downloads/progresso pendente | PostgreSQL/Supabase como verdade; estado de tela em React | falta uma camada explícita de rascunho e reconciliação no cliente |
| Cache | memória, persistente e catálogos especializados | quase tudo `no-store`; service worker só para shell/assets | seguro, porém mais sensível a latência e reconexões |
| Offline | pacotes, respostas pendentes e sincronização | não disponível para dados autenticados | implementar por capacidade, nunca com cache genérico de páginas/API |
| Resiliência de rede | detecção de conexão, retry e sincronização | tratamento local de erro por página | criar política central para retry, timeout, idempotência e mensagens |
| Paginação | carregamento incremental em catálogos/listas | respostas inteiras em telas principais | introduzir cursores antes do crescimento do banco |
| Sessão de prova | progresso periódico/local + remoto | cada resposta confirmada vai ao servidor; estado de navegação é volátil | base remota é boa; falta checkpoint de UX |
| Autenticação | conta, perfil e permissões amplas | acesso pessoal por cookie HttpOnly e chave hash | manter simplicidade; não importar sistema de perfil social |
| Conteúdo | catálogo amplo e recursos de comunidade | corpus controlado e rastreável pelo edital/fontes | fidelidade e governança têm prioridade sobre volume |
| Observabilidade | sinais de analytics e desempenho no cliente | logs locais/servidor, sem camada de UX observada | medir latência e abandono com eventos próprios, sem copiar taxonomia externa |

## Arquitetura atual do CFS Tutor

```text
PWA / páginas React
  ├── estado efêmero de interface
  ├── navegação App Router
  └── fetch sem cache de dados
          ↓
API Routes do Next.js
  ├── autenticação pessoal
  ├── composição de leitura
  ├── validação de comandos
  └── serviços de prioridade, missão, revisão e ingestão
          ↓
Supabase
  ├── PostgreSQL como fonte de verdade
  ├── RPCs de tentativa e simulado
  ├── RLS fechado para acesso direto
  └── storage privado para fontes
```

Pontos fortes:

- Tentativas, revisões, progresso, erros e simulados têm entidades próprias.
- A criação e conclusão de simulados ocorre em operações de servidor.
- A UI não recebe credenciais privilegiadas.
- O service worker exclui navegações, documentos e APIs do cache.
- A origem das questões e o corte do edital estão incorporados ao modelo.

Limitações relevantes para UX:

- Muitas telas refazem toda a leitura ao montar e não compartilham cache de consulta.
- Filtros, posição de leitura e seleções pendentes ficam apenas no componente.
- Não há contrato uniforme de “carregando / dado anterior / reconectando / falhou / tentar novamente”.
- Listas ainda não têm paginação/cursor.
- O AppShell é mínimo; navegação, continuidade e regiões persistentes não estão orquestradas em um único lugar.

## Arquitetura-alvo clean-room

```text
AppShell
├── navegação responsiva
├── estado de conectividade
├── feedback global não bloqueante
└── limites de erro

Camada de experiência
├── query cache apenas em memória para leituras seguras
├── filtros serializáveis e versionados
├── sessão de resolução com máquina de estados própria
└── rascunho local mínimo, criptograficamente não sensível

API/BFF
├── comandos idempotentes
├── cursores de paginação
├── ETag/versão para reconciliação
└── DTOs sem detalhes internos

PostgreSQL/Supabase
└── continua como fonte de verdade pedagógica e de auditoria
```

Não é necessário adotar bibliotecas ou estruturas da referência. Os conceitos podem ser implementados com interfaces próprias: `QuestionQuery`, `ResolutionSession`, `DraftCheckpoint`, `SyncResult` e `PerformanceSlice`, definidos a partir das necessidades do CFS.

## Guardrails

- Nenhum conteúdo autenticado em cache genérico do service worker.
- Nenhuma resposta marcada como salva até confirmação do servidor.
- Rascunho local contém apenas identificadores próprios, posição, seleção ainda não enviada, timestamps e versão; nunca fonte privada ou explicação completa.
- Toda mutação recebe chave de idempotência ou versão suficiente para tolerar retry.
- Filtros são validados no servidor e limitados ao edital atual.
- Mudanças de schema devem ser desenhadas e revisadas separadamente; este estudo não autoriza migrações.

