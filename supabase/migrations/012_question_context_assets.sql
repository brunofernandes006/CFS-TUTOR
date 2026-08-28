alter table public.question_candidates
  add column if not exists context_text text,
  add column if not exists requires_source_visual boolean not null default false;

alter table public.questions
  add column if not exists context_text text,
  add column if not exists requires_source_visual boolean not null default false;

comment on column public.questions.context_text is
  'Texto contextual pertencente à questão na fonte oficial, separado do enunciado principal.';
comment on column public.questions.requires_source_visual is
  'Verdadeiro quando a resolução depende de imagem, diagrama, tabela ou outro elemento visual da página de origem.';
