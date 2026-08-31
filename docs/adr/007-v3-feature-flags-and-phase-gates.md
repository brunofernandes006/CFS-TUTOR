# ADR 007 — Feature flags e gates de fase da V3

- **Status:** aceito
- **Data:** 30/08/2026
- **Escopo:** governança preparatória; não ativa funcionalidade V3

## Contexto

A migração é expand/contract e possui mudanças críticas de identidade, autorização e dados. Um booleano global permitiria combinações não testadas e poderia misturar autenticação legada com Supabase Auth.

## Decisão

Cada capacidade V3 possui flag server-only independente, desligada por padrão. Uma flag somente pode ter consumidor depois que o critério de aceite da fase imediatamente anterior estiver verde e houver rollback documentado. A ativação não substitui autorização: rota, método, identidade e RLS continuam sendo decididos por contratos próprios.

As flags preparadas na Fase 0 são `authPilot`, `identityBridge`, `dataRls`, `shell`, `study`, `questions`, `collections`, `simulations`, `gamification`, `performance` e `admin`. Nenhuma usa `NEXT_PUBLIC_`; nenhuma é lida pela V2.

Regras obrigatórias:

1. ausência, valor inválido ou variável vazia equivale a `false`;
2. não existe flag `legacyOrAuth` nem modo híbrido;
3. o mapa de rota/método é deny-by-default;
4. a flag de uma fase não pode ligar implicitamente outra;
5. mudanças de flag em produção exigirão registro operacional e rollback, mas a Fase 0 não configura ambiente remoto;
6. contract destrutivo nunca é revertido apenas por flag.

## Consequências

- Rollout pode ser gradual sem alterar invariantes V2.
- Há mais estados de configuração; testes de dependência entre flags serão obrigatórios antes do primeiro consumidor.
- As flags atuais são infraestrutura inerte e podem ser removidas sem efeito funcional.

## Gate

Fase 1 só pode iniciar quando o contrato [phase-1-entry-gate.md](../v3/contracts/phase-1-entry-gate.md) estiver integralmente verde. Ativar qualquer flag V3 durante a Fase 0 viola este ADR.
