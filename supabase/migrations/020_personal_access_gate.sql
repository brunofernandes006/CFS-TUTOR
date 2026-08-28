alter table public.app_users add column if not exists access_key_hash text;
comment on column public.app_users.access_key_hash is 'SHA-256 da chave pessoal de acesso ao CFS Tutor; nunca armazena a chave em texto puro.';
