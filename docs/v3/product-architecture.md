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
└── armazenamento local: preferências e checkpoints mínimos
          │ cookies SSR / PKCE
          ▼
Next.js App Router — Node.js runtime
├── layouts e guardas por grupo de rota
├── Server Actions para mutações internas simples
├── Route Handlers para streaming, upload, webhooks e contratos HTTP
├── serviços de domínio sem dependência de UI
└── admin BFF com autorização explícita
          ▼
Supabase
├── Auth: email + senha, confirmação e recuperação
├── PostgreSQL: conteúdo global + dados por usuário
├── RLS e grants por operação
├── RPCs atômicas e idempotentes
└── Storage privado com políticas próprias
```

### Fronteiras

- Server Components fazem leituras iniciais diretamente pela camada servidor, evitando browser → API → banco quando não há necessidade de contrato HTTP.
- Client Components ficam restritos à interação contínua: seleção, filtros, mapa de questões, timer, rascunho e feedback.
- Server Actions são preferidas para mutações internas de formulário. Route Handlers permanecem para uploads, callbacks de Auth, integração PWA e operações que precisam de semântica HTTP estável.
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

- `auth.users.id` é a identidade canônica; `public.profiles.id` referencia esse UUID.
- Tabelas privadas do aluno usam `user_id` e políticas com `(select auth.uid()) = user_id` para cada operação necessária.
- `TO authenticated` nunca é usado sozinho como autorização de linhas privadas.
- Conteúdo publicado é legível por autenticados; escrita de conteúdo não é concedida ao cliente.
- Administração passa por backend autorizado. Papel não depende de `user_metadata`; a fonte canônica fica em tabela privada administrada pelo servidor.
- `service_role` nunca chega ao browser e não é usado como atalho para operações comuns do aluno.
- Views expostas usam `security_invoker` ou ficam em schema não exposto.
- Funções privilegiadas são mínimas, fora do schema exposto quando possível, com `EXECUTE` revogado de `PUBLIC` e verificação explícita de identidade.
- Grants e políticas RLS são entregues e testados juntos.

## PWA e cache

- Rotas autenticadas permanecem dinâmicas e não usam ISR compartilhado.
- Service worker não armazena HTML autenticado, respostas de API, fontes privadas ou conteúdo sensível.
- Cache persistente é permitido somente para shell, assets públicos versionados e, numa fase futura, pacotes de estudo explicitamente baixados e criptograficamente escopados ao usuário.
- Cache em memória pode revalidar leituras por usuário; chaves sempre incluem `userId`, escopo, versão do edital e filtros.

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

Referências oficiais consultadas em 30/08/2026: [Supabase Auth](https://supabase.com/docs/guides/auth), [escolha de pacote server-side](https://supabase.com/docs/guides/auth/choosing-a-server-package), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [autenticação por senha](https://supabase.com/docs/guides/auth/passwords) e [changelog](https://supabase.com/changelog?types=breaking-change).

