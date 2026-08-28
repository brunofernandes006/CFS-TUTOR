create table if not exists public.question_candidates (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  source_page integer check (source_page is null or source_page > 0),
  statement text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  parser_confidence integer not null default 0 check (parser_confidence between 0 and 100),
  raw_block text,
  status text not null default 'NEEDS_REVIEW' check (status in ('NEEDS_REVIEW','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_document_id, question_number)
);

create table if not exists public.answer_key_candidates (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  correct_option_index smallint not null check (correct_option_index between 0 and 4),
  source_page integer check (source_page is null or source_page > 0),
  parser_confidence integer not null default 0 check (parser_confidence between 0 and 100),
  raw_fragment text,
  status text not null default 'NEEDS_REVIEW' check (status in ('NEEDS_REVIEW','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_document_id, question_number)
);

create index if not exists idx_question_candidates_source_status
  on public.question_candidates(source_document_id, status, question_number);
create index if not exists idx_answer_key_candidates_source_status
  on public.answer_key_candidates(source_document_id, status, question_number);

alter table public.question_candidates enable row level security;
alter table public.answer_key_candidates enable row level security;
