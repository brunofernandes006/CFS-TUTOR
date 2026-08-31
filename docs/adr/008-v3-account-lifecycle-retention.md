# ADR 008 — Ciclo de vida, retenção e exclusão de conta na V3

- Status: aceito como contrato de produto; implementação proibida na Fase 0
- Data: 30/08/2026
- Escopo: contas comuns da V3, dados privados e auditoria mínima

## Contexto

A V3 substituirá a chave pessoal da V2 por Supabase Auth em uma fase futura. O ciclo de vida precisa estar definido antes da primeira migration funcional para evitar contas órfãs, retenção indefinida e exclusões incompletas. Este ADR não altera autenticação, banco ou produção.

## Decisão

### Entrada e credenciais

1. O lançamento inicial será **invite-only**. Cadastro público permanece desabilitado até decisão posterior documentada em novo ADR.
2. O convite é individual, expira e só ativa a conta depois da confirmação do endereço de e-mail. Convite aceito sem e-mail confirmado não concede acesso ao produto.
3. Recuperação de senha usa exclusivamente o fluxo do Supabase Auth, com link de uso único, expiração e invalidação das sessões conforme a política do provedor.
4. A aplicação nunca armazena, replica, registra em log ou recebe de volta o hash da senha. Senhas existem apenas no domínio do Supabase Auth; formulários usam transporte TLS e SDK/endpoint oficial.
5. Contas de administrador não compartilham credenciais e exigem papel explícito, menor privilégio e trilha de auditoria.

### Estados

Os estados funcionais serão `invited`, `active`, `suspended`, `deletion_pending` e `deleted`. A autoridade de autenticação continua sendo a definida por fase no ADR 001; estes estados não criam uma segunda identidade.

- `suspended`: bloqueia novas sessões e uso do produto imediatamente; sessões existentes são revogadas. Dados são preservados durante investigação ou suporte.
- `deletion_pending`: bloqueia o uso e inicia uma janela de 30 dias. O titular pode cancelar a solicitação após nova verificação de identidade.
- `deleted`: ocorre após a limpeza verificada dos dados privados. A exclusão do usuário no Auth é a última etapa.

### Exclusão e retenção

1. O titular pode solicitar exclusão; administrador autorizado pode iniciá-la por obrigação legal, abuso ou encerramento, sempre com motivo categorizado e verificação de autoridade.
2. Após 30 dias em `deletion_pending`, um processo idempotente exclui definitivamente os dados privados: tentativas e respostas, sessões de estudo, agenda e histórico privado de revisões, caderno de erros, execuções e respostas de simulados, cadernos pessoais e itens, favoritos, metas, progresso, preferências, filtros salvos, XP, streaks e sessões/tokens.
3. Conteúdo compartilhado e rastreável — questões, provas, fontes oficiais, itens de edital e versões editoriais — não pertence à conta e não é apagado. Contribuições administrativas publicadas devem perder a associação pessoal quando ela não for indispensável à auditoria.
4. Onde a remoção física imediata quebraria integridade referencial, o registro é anonimizado antes da exclusão da identidade. Não se usa e-mail, nome ou UUID reutilizável como pseudônimo.
5. Backups seguem sua expiração técnica normal e não são reescritos. Se restaurados, a fila de exclusões/tombstones é reaplicada antes de liberar o ambiente.
6. Exceção de retenção legal exige registro de base, escopo e prazo; bloqueio genérico ou permanente não é permitido.

### Auditoria mínima

Após a exclusão, pode permanecer por 12 meses somente: identificador aleatório do evento, datas de solicitação e execução, tipo de ator, motivo categorizado, versão da política, contagens de registros processados e resultado técnico. Não permanecem e-mail, nome, conteúdo de estudo, respostas, desempenho, UUID de Auth ou identificador que permita reconstruir o perfil. Ao fim de 12 meses, o evento é removido, salvo retenção legal documentada.

### Responsabilidades

- Usuário: manter o e-mail acessível, proteger credenciais, confirmar solicitações e exportar o que desejar antes do prazo.
- Administrador autorizado: verificar identidade/autoridade, registrar motivo, suspender, aprovar exceções e conferir a reconciliação final; nunca visualizar senha.
- Operação: manter backups, segregar ambientes, limitar `service_role`, executar restauração testada e reaplicar tombstones.
- Suporte: orientar e consultar apenas estado mínimo; não recebe senha, chave de serviço ou dump de dados privados.

## Contrato de implementação futura

A implementação deverá ter idempotency key, reconciliação por tabela, retry seguro, tombstone não identificável para restaurações, revogação de sessões e teste aluno A/aluno B/admin/service role. Uma falha parcial mantém `deletion_pending` e não remove o usuário Auth até todas as etapas privadas obrigatórias estarem confirmadas.

## Consequências

Invite-only reduz abuso e simplifica o cutover inicial, mas exige operação de convites. A janela de 30 dias permite recuperação de enganos; dados privados continuam inacessíveis durante esse período. A auditoria mínima comprova execução sem conservar o perfil.

## Fora de escopo da Fase 0

Nenhuma configuração do Supabase Auth, tabela, migration, rotina de exclusão, e-mail ou alteração de produção é autorizada por este ADR.
