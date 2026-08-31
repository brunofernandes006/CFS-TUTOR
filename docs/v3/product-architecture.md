# CFS Tutor V3 — arquitetura de produto

## Status e escopo

Este conjunto de documentos é a especificação unificada da V3. Ele substitui decisões de produto conflitantes da V2, mas não autoriza alteração de código, banco, migrations ou ambiente. A implementação só começa pelas fases de [implementation-roadmap.md](./implementation-roadmap.md).

Documentos complementares:

- [Navegação](./navigation.md)
- [Módulo Estudar](./study-module.md)
- [Autenticação multiusuário](./multiuser-auth.md)
- [Motor de questões](./question-engine.md)
- [Modelo de dados](./data-model.md)
- [UX e performance](./ux-performance.md)
- [Plano de migração](./migration-plan.md)
- [Roadmap](./implementation-roadmap.md)
- [ADR 001 — identidade e cutover](../adr/001-v3-identity-and-auth-cutover.md)
- [ADR 002 — autorização e RPCs](../adr/002-v3-database-authorization-and-rpcs.md)
- [ADR 003 — sigilo do gabarito](../adr/003-v3-question-answer-secrecy.md)
- [ADR 004 — cache e estado local](../adr/004-v3-cache-and-local-state.md)
- [ADR 005 — versionamento](../adr/005-v3-curriculum-question-versioning.md)
- [ADR 006 — consistência pedagógica](../adr/006-v3-attempt-review-simulation-consistency.md)

Os ADRs acima são normativos. Expressões anteriores como “diretamente ou”, “nova ou absorvida” e “atômico ou outbox” deixam de representar alternativas abertas quando um ADR fixa a decisão.

## Visão do produto

O CFS Tutor V3 é uma PWA mobile-first e multiusuário para preparação do CFS/Sargento PMESP. O sistema transforma edital vigente, conteúdo oficial, provas anteriores, questões rastreáveis, desempenho e revisão em um ciclo diário:

```text
Meta → Estudar conteúdo real → Recuperar sem consulta → Resolver questões
     → Classificar erros → Revisar → Medir desempenho → Repriorizar
```

O produto não é uma plataforma generalista de concursos. Seu diferencial é a fidelidade ao edital e às fontes, combinada com personalização individual verificável.

## Referência clean-room

A análise em `docs/gran-reference/` identificou padrões funcionais genéricos de uma experiência madura: navegação principal compacta, profundidade contextual, filtros hierárquicos e reutilizáveis, listas incrementais, skeletons especializados, retomada de sessão, ações auxiliares dentro da resolução, cache de metadados, pré-carregamento limitado, detecção de conectividade e sincronização posterior.

A V3 pode buscar os mesmos resultados de UX por desenho e implementação próprios. Não serão usados código, assets, textos, conteúdo, identidade visual, contratos de API, endpoints, credenciais, regras internas ou estruturas proprietárias da referência.

## Invariantes pedagógicos e de rastreabilidade

1. O edital vigente define o escopo corrente de estudo.
2. Conteúdo apresentado como oficial deve estar ligado a fonte validada, página ou seção quando disponível, autoridade, vigência e versão.
3. `[QUESTÃO REAL]` exige prova rastreável e gabarito oficial correspondente.
4. Questão anulada não recebe alternativa correta fabricada e não gera domínio positivo/negativo normal.
5. Questão dependente de elemento visual só é liberada se o recurso oficial estiver preservado.
6. Questão histórica fora do edital atual pode aparecer em “Provas anteriores”, mas não entra silenciosamente em treino, revisão ou simulado corrente.
7. Conteúdo gerado internamente deve ser rotulado e nunca promovido a oficial por automação.
8. Domínio, incidência e prioridade só são declarados com amostra suficiente e explicável.
9. Erro causal é informado ou editado pelo aluno; não é inferido silenciosamente.
10. Alterações administrativas em fonte, gabarito, conteúdo ou questão deixam trilha de auditoria.

## Arquitetura atual

- Next.js 16.3 App Router, React 19 e TypeScript.
- Páginas predominantemente Client Components que leem Route Handlers.
- Supabase PostgreSQL como fonte de verdade e Storage privado para documentos.
- Chamadas REST/RPC feitas pelo backend com `service_role`.
- Acesso de usuário único por chave própria, cookie HttpOnly e `DEFAULT_USER_ID` fixo.
- RLS habilitado, porém sem políticas de acesso direto para usuários; o backend privilegiado concentra as operações.
- Service worker armazena somente shell e assets estáticos, nunca navegação autenticada ou API.

Limitações para a V3: identidade fixa, excesso de páginas totalmente clientes, `service_role` em operações comuns, estado de tela volátil, falta de favoritos/cadernos/metas/XP, filtros limitados e ausência de conteúdo de estudo completo por item.

## Arquitetura-alvo

```text
Browser / PWA
├── Server Components: primeira leitura autenticada e streaming
├── Client Islands: filtros, resolução, timers e otimistic UI
├── URL state: consultas e navegação reproduzível
├── memória: cache curto e prefetch
└── armazenamento local: allowlist de IDs/posição, isolada por authUserId
          │ cookies SSR / PKCE
          ▼
Next.js App Router — Node.js runtime
├── layouts e guardas por grupo de rota
├── Server Actions para mutações internas simples
├── Route Handlers para Auth, upload, webhooks e comandos idempotentes de sessão
├── serviços de domínio sem dependência de UI
└── admin BFF com autorização explícita
          ▼
Supabase
├── Auth: email + senha, confirmação e recuperação
├── PostgreSQL: conteúdo global + dados por usuário
├── RLS e grants por operação
├── schema API seguro sem gabarito + schema privado de correção
├── RPCs atômicas/idempotentes derivando auth.uid()
└── Storage privado com políticas próprias
```

### Fronteiras

- Server Components fazem leituras iniciais diretamente pela camada servidor, evitando browser → API → banco quando não há necessidade de contrato HTTP.
- Client Components ficam restritos à interação contínua: seleção, filtros, mapa de questões, timer, rascunho e feedback.
- Server Actions são preferidas para formulários internos simples. Submissão de questão, checkpoint, resposta/finalização de simulado, uploads, callbacks de Auth e operações com idempotência/retry usam Route Handlers versionados e RPCs de domínio; isso mantém contrato HTTP estável para a PWA.
- Runtime Node.js é o padrão. Nenhum módulo é movido para Edge sem requisito e teste de compatibilidade.
- DTOs entre Server e Client são objetos serializáveis; datas cruzam a fronteira como strings ISO.

## Domínios

| Domínio | Responsabilidade |
|---|---|
| Identity | Auth, perfil, preferências, papéis e sessão |
| Curriculum | disciplinas, edital, itens, versões e escopo corrente |
| Sources | documentos, páginas, assets visuais, validação e auditoria |
| Study Content | unidades oficiais/didáticas ligadas a item do edital |
| Questions | banco de questões, relações, filtros, tentativas e reportes |
| Study Session | filas, checkpoints, tempo, recuperação ativa e conclusão |
| Review | agenda adaptativa, retenção e recuperação |
| Errors | classificação, reincidência, resolução e lacuna conceitual |
| Collections | favoritos, cadernos e itens ordenados |
| Exams | provas anteriores, gabaritos, aplicações e simulados |
| Goals & XP | metas, eventos de XP, níveis, sequência e conquistas |
| Performance | agregados individuais com amostra e período |
| Admin | ingestão, revisão, publicação, auditoria e saúde do corpus |

## Segurança e acesso

- `auth.users.id` é a identidade canônica após o cutover; durante expand/contract, `app_users` é somente ponte de domínio conforme ADR 001.
- Cada rota é `PUBLIC`, `LEGACY_OWNER` ou `AUTH_V3`; nenhuma rota aceita simultaneamente cookie legado e sessão Auth como autoridade.
- Tabelas privadas novas usam `user_id → auth.users.id`; tabelas V2 usam a ponte auditável até a contração. Policies verificam sessão não nula e owner para cada operação.
- `TO authenticated` nunca é usado sozinho como autorização de linhas privadas.
- Conteúdo publicado é legível por autenticados somente por projeções/views seguras. A role do aluno não lê tabelas editoriais nem relações que contenham gabarito, explicação pós-resposta ou fonte bruta.
- Administração passa por backend autorizado. Papel não depende de `user_metadata`; a fonte canônica fica em tabela privada administrada pelo servidor.
- Há clientes separados `user-scoped` e `admin`; `service_role` nunca chega ao browser, não é usado em operação comum e sua importação em fluxo de aluno falha em teste de arquitetura.
- Views expostas usam `security_invoker` ou ficam em schema não exposto.
- Funções privilegiadas ficam em schema não exposto, usam `search_path = ''`, nomes qualificados, `EXECUTE` revogado de `PUBLIC`/`anon`, `auth.uid()` não nulo e verificação de propriedade. RPC de aluno nunca aceita `p_user_id`.
- Grants e políticas RLS são entregues e testados juntos.

### Fronteira de gabarito

- `question_versions` contém somente o material apresentável; correção fica em `private.question_answer_versions`.
- O browser recebe apenas `PublicQuestionDTO`; prefetch usa o mesmo DTO.
- Correção é feita pela submissão autenticada/idempotente e devolve `QuestionFeedbackDTO` somente quando a política da sessão permite.
- Simulado em andamento nunca recebe resposta, explicação ou resultado; esses dados só são liberados após finalização única.

## PWA e cache

- Rotas autenticadas permanecem dinâmicas e não usam ISR compartilhado.
- `use cache` compartilhado só pode envolver função pura de catálogo global e nunca captura cookies, sessão ou cliente RLS. `React.cache` é permitido para deduplicação no request.
- Service worker usa allowlist de paths estáticos e não armazena HTML autenticado, API, Auth, URLs assinadas, assets de questão/fonte ou conteúdo sensível.
- Cache persistente é permitido somente para shell, assets públicos versionados e, numa fase futura, pacotes de estudo explicitamente baixados e criptograficamente escopados ao usuário.
- Cache em memória privado inclui `authUserId`, versão do schema, escopo, versão do edital e filtros e é destruído no logout/troca de usuário.
- Persistência local inicial contém apenas IDs, posição, índice de alternativa não confirmada, filtros não sensíveis e versão; nunca tokens, conteúdo, gabarito, explicação, notas ou payload de API.

## Dados, consistência e escala

- `syllabus_items` é conceito estável; `syllabus_version_items` define participação em cada edital. Sessão/simulado fixa a versão ao nascer.
- Edição de questão gera versão; rows históricas recebem versão-baseline por backfill idempotente e não são recalculadas pela versão atual.
- Tentativa, progresso, revisão e caderno de erros formam o núcleo transacional. A mesma transação grava evento outbox; XP, metas e agregados são projeções reconstruíveis.
- `ReviewPolicyV3` versionada é a fonte canônica para 24h/7d/30d/60d e preserva gates de evidência da V2.
- Listas grandes usam cursor estável; joins e agregações são resolvidos no banco. Nenhuma API baixa catálogos completos ou limita silenciosamente o histórico a 5.000 linhas.

## Painel administrativo

Área separada em `/admin`, invisível para alunos não autorizados:

- dashboard de saúde do corpus;
- ingestão e classificação de fontes;
- revisão de edital e conteúdo;
- pareamento prova ↔ gabarito;
- validação de questões e assets visuais;
- vínculo conteúdo ↔ fonte ↔ item do edital;
- fila de reportes;
- publicação, despublicação e versionamento;
- auditoria de ações e cobertura por disciplina/item.

Administração não altera progresso individual, salvo operação de suporte auditada e excepcional.

## Decisões atuais de plataforma

- Usar Node.js 22 ou superior para a linha de clientes Supabase vigente.
- Para sessão SSR em Next.js, adotar pacote suportado para cookies, com versão fixada e lockfile; validar a API na implementação porque a camada SSR ainda pode mudar.
- Verificar exposição da Data API e grants explicitamente: novas tabelas podem não ser expostas automaticamente.
- Rotas que leem ou renovam sessão são dinâmicas e não podem produzir cache compartilhado com `Set-Cookie`.
- O piloto V3 usa `/v3/**`; route groups não duplicam a URL das páginas V2. O cutover troca uma única implementação por URL.
- Signup inicial é por convite/aprovação administrativa; autenticação não equivale automaticamente a conta ativa.

Referências oficiais consultadas em 30/08/2026: [Supabase Auth](https://supabase.com/docs/guides/auth), [escolha de pacote server-side](https://supabase.com/docs/guides/auth/choosing-a-server-package), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [autenticação por senha](https://supabase.com/docs/guides/auth/passwords) e [changelog](https://supabase.com/changelog?types=breaking-change).
