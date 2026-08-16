# Relatório — Fase 7C: Calibração do Dashboard e Estado Inicial

**Data:** 2026-08-12
**Status:** APROVADA

---

## 1. Problema diagnosticado

Ao iniciar a Fase 7C, o dashboard exibia o nome **"Teste aluno_novo"** como perfil principal. A investigação revelou que os testes automatizados da Fase 7B rodaram contra o banco de **produção** (`cfs_catalogo.db`), criando 8 usuários de teste (ids 1–8) diretamente na tabela `users`. O id=1 foi ocupado por `aluno_novo`, impedindo que `ensureDefaultUser()` corrigisse o perfil.

Adicionalmente, o indicador de Prontidão CFS retornava ~15% mesmo sem nenhum histórico de estudo — porque o componente `reviewsOnTime` era inicializado com 100% quando não havia revisões agendadas.

---

## 2. Correções aplicadas

### 2.1 Usuário padrão (`userService.ts`)

`ensureDefaultUser()` agora:
- Detecta se id=1 tem username correspondente a um padrão de teste
- Corrige silenciosamente (UPDATE) sem apagar nenhum outro usuário
- Expõe `isDefaultUserHealthy()` para uso em testes e diagnóstico

Lista de padrões detectados como "usuário de teste":
```
aluno_novo, aluno_acertos, aluno_erros, aluno_revisao,
aluno_novo_conteudo, aluno_ponto_fraco, aluno_disciplinas,
aluno_prontidao, teste_*, test_*
```

Banco de produção corrigido diretamente:
```
id=1 → username=aluno_cfs, full_name=Aluno CFS
```

Os 8 usuários de teste (ids 1–8) foram **preservados** — não apagados.

---

### 2.2 Prontidão CFS com fator de confiança (`pedagogyService.ts`)

#### Problema anterior
O componente `reviewsOnTime` usava `100%` quando não havia revisões agendadas, inflando o score para ~15% mesmo sem histórico.

#### Solução implementada

**Fórmula do fator de confiança:**
```
q_factor   = min(tentativas_totais / 20, 1.0)    peso 0.40
cov_factor = min(itens_estudados / 30, 1.0)       peso 0.35
disc_factor = disciplinas_com_dados / 3            peso 0.25

confidence_factor = q_factor×0.40 + cov_factor×0.35 + disc_factor×0.25
```

**Fórmula de exibição:**
```
readiness_display = round(readiness_raw × confidence_factor)
```

**Rótulos de confiança:**

| confidence_factor | Rótulo       | Comportamento na UI              |
|-------------------|--------------|----------------------------------|
| = 0               | SEM_DADOS    | Exibe "— %" com orientação       |
| < 0.25            | INICIAL      | Score + aviso "Dados insuficientes" |
| < 0.60            | PARCIAL      | Score + aviso "Estimativa em construção" |
| ≥ 0.60            | SUFICIENTE   | Score + disclaimer de não-aprovação |

**Correção no score bruto:** `reviewsOnTime` agora usa `0%` (não `100%`) quando não há revisões agendadas. Isso elimina o falso piso de ~15%.

**Interface `ReadinessResult` exportada:**
```typescript
{
  readiness_raw: number         // score bruto 0–100
  readiness_display: number     // score × confidence (exibir)
  confidence_factor: number     // 0.0 – 1.0
  confidence_label: ReadinessConfidence
  components: {
    avg_mastery, coverage, reviews_on_time,
    recent_performance, questions_answered,
    items_studied, disciplines_with_data
  }
}
```

---

### 2.3 Domínio consolidado por disciplina

#### Problema anterior
O mastery médio dos poucos itens estudados era apresentado como se representasse o domínio da disciplina inteira.

#### Solução implementada

**Três métricas separadas por disciplina:**

| Métrica              | Definição |
|----------------------|-----------|
| `mastery_of_studied` | Média do mastery_score apenas dos itens estudados |
| `coverage_pct`       | itens_estudados / itens_totais × 100 |
| `consolidated_mastery` | mastery_of_studied × (coverage_pct / 100) |

**Rationale:** estudar bem 2 itens em 50 não é dominar a disciplina. A fórmula penaliza naturalmente coberturas baixas sem precisar de peso separado.

**Exemplo concreto:**
```
Disciplina: Língua Portuguesa (50 itens)
Itens estudados: 1
Domínio dos estudados: 85%
Cobertura: 1/50 = 2%
Domínio consolidado: 85 × 0.02 = 1.7 → 2%
```

O indicador visual principal da disciplina usa `consolidated_mastery`.

**Aviso contextual:** quando `mastery_of_studied ≥ 70%` e `coverage_pct < 20%`, a UI exibe:
> ⚡ Domínio alto em poucos itens — aumente a cobertura para consolidar.

---

## 3. Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `lib/services/userService.ts` | Detecção e correção de usuário de teste em id=1 |
| `lib/services/pedagogyService.ts` | `calculateReadinessWithConfidence()`, `calculateConsolidatedMastery()`, correção do `reviewsOnTime` |
| `lib/services/dashboardService.ts` | Usa novos campos: `mastery_of_studied`, `coverage_pct`, `consolidated_mastery`, `ReadinessResult` |
| `lib/types.ts` | Novos tipos: `ReadinessResult`, `ReadinessConfidence`; atualização de `DashboardStats` e `DisciplineSummary` |
| `app/page.tsx` | Dashboard com blocos de confiança, domínio consolidado e aviso contextual |
| `app/api/performance/route.ts` | Usa `calculateReadinessWithConfidence` e `calculateConsolidatedMastery` |
| `__tests__/services.test.ts` | +18 testes novos (7C) |

---

## 4. Resultados de validação

### Testes
```
Test Suites : 1 passed
Tests       : 59 passed, 0 failed   (+18 novos da Fase 7C)
Tempo       : ~0.7s
```

**Novos testes incluem:**
- Usuário sem histórico → `SEM_DADOS`, `display = 0`
- 1 questão correta → `display ≤ 10`
- Poucas questões → `confidence_factor < 0.25`
- Aumento de cobertura aumenta `confidence_factor`
- `readiness_display = raw × confidence` (arredondado)
- `consolidated_mastery(85, 4) = 3` (baixo, correto)
- `consolidated_mastery(100, 2) ≤ 5`
- Usuário de teste não vira perfil principal
- `isDefaultUserHealthy()` funciona corretamente
- Dashboard retorna `ReadinessResult` completo
- `consolidated_mastery` com 1 item de 50 ≤ 3

### Build
```
✓ Compiled successfully
✓ TypeScript sem erros
Exit code: 0
```

### Banco de dados
```
foreign_key_check : 0 problemas
integrity_check   : ok
syllabus_items    : 182 (intactos)
users id=1        : username=aluno_cfs, full_name=Aluno CFS
```

---

## 5. Comportamento esperado por estado do usuário

| Estado                          | Prontidão exibida | Rótulo        |
|---------------------------------|-------------------|---------------|
| Nenhuma tentativa               | — %               | Sem dados     |
| 1–3 tentativas, 1 item          | ≤ 10%             | Prontidão inicial |
| 10 tentativas, 5 itens, 1 disc  | ~5–15%            | Parcial       |
| 20+ tentativas, 30+ itens, 3 disc | Valor real       | Suficiente    |

---

## 6. O que NÃO foi alterado

- Arquitetura da aplicação
- Lógica de revisão espaçada
- Lógica de missão diária
- Banco de dados (estrutura de tabelas)
- MVP anterior (`cfs_tutor_mvp/`)
- Documentos originais do acervo
