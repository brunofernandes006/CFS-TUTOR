# CFS Tutor V3 — UX, estado e performance

## Resultado clean-room desejado

A V3 adota resultados funcionais observados na referência — continuidade, feedback imediato, listas graduais, filtros reutilizáveis, contexto preservado e resiliência — com componentes, contratos, microcopy e implementação próprios.

## Estratégia de renderização

- Server Components para shell autenticado, home, primeiras páginas de listas, resumo de desempenho e conteúdo.
- Suspense por seção para streaming; skeleton corresponde à geometria final.
- Client Islands para filtros, sessões, timers, drawers, favoritos e optimistic UI.
- `loading.tsx`, `error.tsx`, `not-found.tsx` e estados vazios por grupo de rota.
- Leituras independentes iniciadas em paralelo; evitar waterfalls.
- Preload no servidor para dependências previsíveis e prefetch cliente apenas sob orçamento.

## Pré-carregamento

### Permitido

- metadados da próxima questão quando a atual estiver pronta;
- próximo bloco de conteúdo;
- resumo leve do item apontado pela missão;
- primeira página do drill-down ao focar/tocar intenção;
- assets visuais da questão seguinte somente em rede adequada.

### Restrições

- limite de uma questão/bloco à frente;
- cancelar ao mudar filtros/sessão;
- respeitar `saveData`, rede lenta e bateria quando disponível;
- não pré-carregar gabarito/feedback antes da tentativa;
- não inserir conteúdo autenticado no cache compartilhado do service worker.
- prefetch de questão usa somente `PublicQuestionDTO`; nunca tabela/view administrativa ou resposta pós-correção.

## Optimistic UI

Seguro com rollback:

- favoritar/desfavoritar;
- adicionar/remover item de caderno;
- renomear caderno/meta;
- alterar preferência;
- selecionar/eliminar alternativa localmente.

Não otimista:

- correção da questão;
- conclusão de sessão/simulado;
- XP, conquista ou sequência;
- classificação de domínio;
- publicação administrativa;
- upload/validação de fonte;
- alteração de senha/papel.

Estados visuais: `idle`, `optimistic`, `syncing`, `confirmed`, `retryable_error`, `conflict`.

## Persistência de estado

| Camada | Estado | Regra |
|---|---|---|
| URL | filtros, período, ordenação, cursor | validado e não sensível |
| React/memória | dados lidos, seleção, UI aberta | escopado ao usuário e rota |
| local versionado | IDs, posição, índice não confirmado, filtros não sensíveis e versão | namespace por `authUserId`; limpar antes de trocar conta |
| servidor | respostas, checkpoints confirmados, progresso, metas e XP | fonte de verdade |

Conflito entre local e servidor usa `serverVersion`/`updatedAt`. Resposta confirmada no servidor vence rascunho; rascunho mais novo pede reconciliação quando não há resposta confirmada.

É proibido persistir localmente token/sessão, email, enunciado, opções, explicação, gabarito, fonte privada, nota/caderno, desempenho ou payload completo. Namespace obrigatório: `cfs:v3:{authUserId}:{schemaVersion}`. Logout local/global e troca de usuário apagam memória, local/session storage e IndexedDB pertencentes ao namespace antes da navegação.

## Cache

- Conteúdo global publicado pode usar cache servidor apenas em função pura parametrizada por versão/locale, sem capturar cookies, sessão ou cliente RLS e sem `Set-Cookie`.
- Dados privados são `no-store` ou deduplicados apenas no request (`React.cache`); nunca usam `use cache`/ISR compartilhado.
- Mutações invalidam tags/queries específicas.
- Rotas de Auth e páginas autenticadas que renovam sessão são dinâmicas.
- Data API e Storage respeitam RLS/políticas; URL assinada tem TTL curto.

## Paginação e busca

- cursor opaco estável composto por valor de ordenação + ID; padrão 25 e máximo 100 para listas grandes e histórico;
- filtros aplicados no servidor;
- debounce/cancelamento para busca textual;
- contagem total somente quando barata; caso contrário mostrar “mais resultados”;
- virtualização apenas após medição.
- enriquecimento é feito por join/batch no banco; proíbe fetch por item e download de catálogos completos para junção cliente/Node;
- contagem exata usa query separada quando barata; nunca usa uma página truncada como total;
- home/desempenho não podem limitar silenciosamente o histórico a 5.000 attempts.

## Orçamento de experiência

| Métrica | Meta inicial |
|---|---:|
| resposta a interação local | <100 ms |
| indicador de operação remota | <300 ms |
| LCP mobile p75 | ≤2,5 s |
| INP p75 | ≤200 ms |
| CLS p75 | ≤0,1 |
| próxima questão com prefetch | conteúdo útil ≤500 ms em rede normal |
| restauração de checkpoint | sem perda de resposta confirmada |

Metas devem ser medidas em produção por tipo de rota, sem registrar conteúdo ou resposta do aluno.

## Mobile e acessibilidade

- safe area, `dvh` quando necessário e conteúdo acima da barra inferior;
- bottom sheets para filtros e cartão de respostas;
- grade de 60 questões com legenda textual;
- foco, escape, retorno de foco e bloqueio de scroll em modais;
- alvos ≥44 px, contraste, zoom 200%, leitor de tela e reduced motion;
- teclado não cobre CTA crítico;
- estado de sincronização anunciado em região live não intrusiva.

Breakpoints de validação: 360×640, 390×844, 412×915, 768×1024 e 1280×800, além de orientação horizontal.

## PWA e offline

Fases iniciais continuam network-first. Uma fase posterior pode permitir pacote baixado explicitamente:

- manifesto do pacote e versão;
- criptografia/isolamento por usuário quando aplicável;
- expiração e revogação;
- fila idempotente de respostas;
- tela de conflitos;
- remoção no logout.

Sem esses requisitos, “offline” significa apenas shell e aviso de reconexão, não estudo completo.

No primeiro corte, o service worker usa allowlist exata de shell e assets públicos versionados. Nunca cacheia navegação, `/api/**`, Auth, URL assinada, asset de questão/fonte ou resposta com `private`, `no-store` ou `Set-Cookie`, mesmo que `request.destination` seja `image`.

Testes obrigatórios incluem A → cache/rascunho → logout → B, refresh de sessão/prefetch, inspeção de todos os storages, ausência de gabarito e duas abas com conflito de `serverVersion`. Ver [ADR 004](../adr/004-v3-cache-and-local-state.md).

## Observabilidade

Eventos próprios e minimizados:

- início/retomada/conclusão/abandono de fluxo;
- duração de leitura e request;
- cache hit/miss técnico;
- retry, conflito e falha de sincronização;
- filtro aplicado e vazio, sem conteúdo sensível;
- Web Vitals por rota/classe de dispositivo.

Não enviar enunciados, alternativas, respostas, tokens, email ou nomes de fontes privadas.
