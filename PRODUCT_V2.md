# CFS Tutor V2 — Especificação de Release

## Objetivo
Sistema mobile-first de estudo estratégico para o CFS/Sargento PMESP, orientado pelo edital vigente, provas anteriores, gabaritos oficiais, desempenho, erros e revisão espaçada.

## Regras invariáveis
- O edital vigente define o escopo corrente.
- `[QUESTÃO REAL]` exige prova rastreável e gabarito oficial.
- Questão anulada não recebe alternativa correta artificial.
- Questão histórica fora do edital atual não entra em treino/revisão/simulado corrente.
- Questão dependente de visual só é liberada quando o recurso oficial estiver preservado.
- Domínio não é declarado com evidência insuficiente.
- Incidência histórica só é usada quando medida em múltiplas provas reais.

## Prova oficial
- Língua Portuguesa: 20 questões, peso 3, contribuição 30%.
- Matemática: 20 questões, peso 2, contribuição 20%.
- Conhecimentos Profissionais: 20 questões, peso 5, contribuição 50%.

## Arquitetura
- Next.js PWA mobile-first.
- Supabase PostgreSQL definitivo.
- Fontes privadas/validadas e service role somente no backend.
- RLS fechado para acesso direto.
- RPCs privilegiadas executáveis apenas por service role.
- Acesso pessoal por chave forte e cookie HttpOnly assinado no servidor.

## Motores
- Prioridade adaptativa por peso, fraqueza, incidência real, recorrência de erro, revisão vencida e conteúdo não estudado.
- Revisão base 24h → 7d → 30d, com adaptação por resultado.
- Simulado OFICIAL 20/20/20 e ADAPTATIVO 10–60.
- Caderno de erros com classificação explícita, nunca inferida silenciosamente.

## Release gate
1. Lint, testes e build verdes.
2. Vercel Preview Ready.
3. Banco sem questão real inválida.
4. Pool oficial ≥20 por disciplina no edital vigente.
5. Segurança Supabase sem `WARN` externo aplicável.
6. Mobile/PWA revisado, sem cache de páginas autenticadas/API.
7. Produção protegida por sessão pessoal.
