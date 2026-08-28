# CFS Tutor V2

PWA mobile-first de estudo estratégico para o CFS/Sargento PMESP.

## Estado da V2

- Supabase PostgreSQL como banco definitivo.
- Edital vigente estruturado como árvore de estudo.
- Questões reais somente com prova e gabarito oficial rastreáveis.
- Questões históricas só entram no estudo corrente quando correspondem a item ativo do edital atual.
- Simulado oficial com distribuição 20 Português / 20 Matemática / 20 Conhecimentos Profissionais e pesos 3 / 2 / 5.
- Revisão adaptativa, caderno de erros, domínio e prioridades baseados em evidência.
- Central de Fontes com validação de tipo, SHA-256, deduplicação, extração e revisão humana.
- Acesso pessoal protegido por chave forte, armazenada apenas como hash, com sessão HttpOnly.
- RLS fechado no Supabase; RPCs privilegiadas executáveis somente por `service_role`.
- PWA não armazena páginas autenticadas nem respostas de API no service worker.

## Desenvolvimento

```bash
npm install
npm run dev
```

Quality gate:

```bash
npm run lint
npm run test:ci
npm run build
```

## Variáveis de servidor

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SOURCE_BUCKET=cfs-fontes
CFS_DEFAULT_USER_ID=00000000-0000-4000-8000-000000000001
```

`SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta ao cliente. A chave pessoal de acesso não deve ser gravada no repositório nem em variáveis públicas.

## Regra de fonte

Uma questão só pode aparecer como `[QUESTÃO REAL]` quando estiver validada contra uma prova rastreável e um gabarito oficial. Questões anuladas não recebem alternativa correta artificial. Elementos visuais obrigatórios precisam ser preservados antes de a questão ser liberada.
