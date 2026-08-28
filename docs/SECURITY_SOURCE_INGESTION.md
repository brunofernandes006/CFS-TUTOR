# Segurança — ingestão de fontes

## Controles implementados

- Limite de 50 MB por arquivo.
- MIME allowlist.
- Nome sanitizado.
- SHA-256 antes de persistir.
- Deduplicação por hash.
- Storage privado em produção.
- Service role somente no servidor.
- Fonte com confiança insuficiente recebe `NEEDS_REVIEW`.

## Controles obrigatórios para produção

- Rate limiting no endpoint de upload.
- Autenticação do usuário.
- Quota por usuário.
- Varredura antimalware no pipeline assíncrono quando houver upload multiusuário.
- Signed URLs para leitura.
- RLS nas tabelas do Supabase antes de uso multiusuário.
- Logs de auditoria para validação/reclassificação/exclusão.
- Nunca executar macros, scripts ou conteúdo embarcado dos documentos.
