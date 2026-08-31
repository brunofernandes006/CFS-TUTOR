# Smoke mobile da V2 — baseline da Fase 0

- Data: 30/08/2026
- Alvo: Next.js local em `http://localhost:3000`, Supabase local reconstruído até migration 020 e fixture `v2_upgrade_fixture.sql`
- Navegador: Chrome for Testing 152, sessão isolada do `agent-browser`
- Produção/remoto: não acessados

## Preparação e ressalva de ambiente

O upgrade local e seus 11 testes pgTAP passaram antes do smoke. A conta sintética recebeu uma chave temporária somente no banco efêmero. O fresh local não concedeu às tabelas os privilégios que o backend V2, executado como `service_role`, precisa; o primeiro login retornou 500/PostgREST `42501`. Para viabilizar apenas o smoke, foram concedidos `SELECT/INSERT/UPDATE/DELETE` em tabelas e uso de sequences ao `service_role` **somente no container local**, sem alterar SQL versionado ou remoto.

Isso evidencia drift operacional ou contrato incompleto de grants da V2. A aplicação produtiva existente pressupõe esses privilégios, mas eles não são reproduzidos pelas migrations locais atuais.

## Matriz de viewports

As sete rotas principais foram carregadas em cada viewport: Home, Estudar, Questões, Revisão, Caderno de Erros, Desempenho e Simulados. Foram medidos `innerWidth`, `documentElement.scrollWidth`, presença da navegação e dimensões dos controles visíveis.

| viewport | rotas carregadas | overflow horizontal | navegação | rolagem quando havia conteúdo |
|---|---:|---|---|---|
| 360 × 800 | 7/7 | ausente; `scrollWidth=360` | inferior + menu | OK |
| 390 × 844 | 7/7 | ausente; `scrollWidth=390` | inferior + menu | OK |
| 412 × 915 | 7/7 | ausente; `scrollWidth=412` | inferior + menu | OK |
| 768 × 1024 | 7/7 | ausente; `scrollWidth=768` | barra superior responsiva | OK |
| 1440 × 900 | 7/7 | ausente; `scrollWidth=1440` | barra superior desktop | OK |

Em 390 px, a Home tinha 531 px de faixa rolável; `scroll down 600` terminou em `scrollY=531`, comprovando rolagem até o final sem deslocamento lateral.

## Fluxos funcionais

| fluxo | evidência observada | resultado |
|---|---|---|
| login V2 | chave da fixture validada; `POST /api/auth/login` 200; redirecionamento `/login` → `/` | PASSOU após grant local descrito acima |
| Home | plano e item sintético carregados; ações Estudar/Revisão/Questões/Fontes presentes | PASSOU |
| Estudar | título, filtros e item do edital sintético carregados; API `/api/syllabus` 200 | PASSOU |
| Questões | questão real sintética carregada sem gabarito inicial | PASSOU |
| responder questão | alternativa A submetida; `POST /api/attempts` 200; só então surgiram “Resposta incorreta”, gabarito B, explicação e fonte | PASSOU |
| Revisão | rota e agenda da fixture carregadas; API `/api/reviews` 200 | PASSOU |
| Caderno de erros | rota, filtros e registro derivado da tentativa carregados; API `/api/error-notebook` 200 | PASSOU |
| Desempenho | indicadores da fixture carregados; API `/api/performance` 200 | PASSOU |
| Simulados | criação oficial/adaptativa e histórico visíveis; resultado do simulado fixture abriu em `/simulados/90000000-0000-4000-8000-000000000001/resultado` | PASSOU |
| menu | drawer “Mais” abriu e expôs Hoje, Estudar, Questões, Desempenho, Revisão, Simulados, Caderno, Fontes e Sair | PASSOU |
| reload | `/estudar` permaneceu autenticado e recarregou | PASSOU |
| voltar/avançar | `/estudar` → voltar para `/` → avançar para `/estudar` | PASSOU |
| erro de rede | abort de `**/api/home` mostrou “Não foi possível carregar o plano” e “Tentar novamente”; remoção do abort + reload recuperou a Home | PASSOU |

## Touch targets e safe areas

A inspeção encontrou alvos menores que 44 px em todas as larguras. Exemplos: marca CFS 36×36, menu 40×40, filtros 42 px de altura e links superiores 40 px. A navegação inferior usa itens com altura mínima maior, mas seu `padding-bottom` computado foi `0px`; portanto não há evidência de compensação por `env(safe-area-inset-bottom)`.

Classificação: dívida UX V2, não corrigida por restrição da Fase 0. Antes de declarar conformidade mobile V3, os alvos essenciais devem atingir 44×44 CSS px e a barra inferior deve aplicar/testar safe area em dispositivo com recorte/indicador de gesto.

## Resultado do gate

O smoke solicitado foi executado e é reproduzível, sem overflow e com os fluxos V2 funcionais. Ficam registradas duas dívidas visuais (touch targets e safe area) e uma divergência técnica de grants no fresh local. Nenhuma delas foi mascarada ou corrigida por mudança funcional nesta fase.
