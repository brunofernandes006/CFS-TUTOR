alter table public.source_documents enable row level security;
alter table public.source_relationships enable row level security;
alter table public.question_sources enable row level security;

-- V2 inicial usa somente operações server-side com service role.
-- Portanto não criamos policies públicas/anon neste estágio.
