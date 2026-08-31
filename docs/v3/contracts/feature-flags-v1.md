# Contrato — feature flags V3

As flags são server-only, `false` por padrão e não possuem consumidores na Fase 0.

| Capacidade | Variável | Primeira fase autorizada |
|---|---|---:|
| piloto Auth | `CFS_V3_AUTH_PILOT` | 1 |
| ponte de identidade | `CFS_V3_IDENTITY_BRIDGE` | 1 |
| dados/RLS V3 | `CFS_V3_DATA_RLS` | 2 |
| shell e estado | `CFS_V3_SHELL` | 3 |
| Estudar | `CFS_V3_STUDY` | 4 |
| questões/sessões | `CFS_V3_QUESTIONS` | 5 |
| revisões/coleções | `CFS_V3_COLLECTIONS` | 6 |
| simulados/provas | `CFS_V3_SIMULATIONS` | 7 |
| metas/XP | `CFS_V3_GAMIFICATION` | 8 |
| desempenho | `CFS_V3_PERFORMANCE` | 9 |
| administração V3 | `CFS_V3_ADMIN` | 10 |

Uma flag só pode ser lida por código da própria capacidade e depois da autorização da fase. Dependências devem falhar fechadas: ligar `study` sem `shell`/`dataRls`, por exemplo, não torna a rota alcançável. Valores diferentes de `true` são falsos. Não se copiam flags para `NEXT_PUBLIC_*`; o cliente recebe apenas capacidades já autorizadas pelo servidor.

Rollback da Fase 0: remover `lib/server/v3FeatureFlags.ts` e as variáveis de exemplo. Como não há consumidor, isso não altera comportamento.
