# Contrato — mutabilidade de resposta por modo

Este contrato fecha a pendência de produto apontada na revisão final sem implementar o motor.

| Modo | Antes de submeter | Depois de submissão válida | Feedback |
|---|---|---|---|
| treino/questões | seleção local pode mudar | tentativa imutável; nova resposta exige nova sessão/item | imediato após commit |
| revisão | seleção local pode mudar | tentativa imutável; reestudo cria novo item | imediato após commit |
| recuperação ativa | resposta local pode ser editada antes de revelar | evento imutável após revelar/avaliar | após ação explícita |
| simulado oficial/adaptativo | alternativa pode mudar até avançar/salvar | resposta confirmada imutável na V3 inicial | somente após finalização única |

Retry com a mesma chave de idempotência e mesmo payload devolve o mesmo resultado; payload diferente conflita. Nenhum modo reabre ou sobrescreve uma tentativa. Uma futura troca de resposta no simulado exigirá novo comando versionado, auditoria e ADR; não pode reutilizar silenciosamente o endpoint de submissão.

Questão anulada gera registro neutro, não possui alternativa correta, não entra em denominador de domínio/nota e não cria caderno de erros. O cliente nunca recebe explicação ou gabarito antes do marco de feedback descrito na tabela.
