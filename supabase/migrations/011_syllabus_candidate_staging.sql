create table if not exists public.syllabus_candidates (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  discipline_code text not null check (discipline_code in ('PROF','PORT','MAT')),
  edital_code text not null,
  parent_edital_code text,
  title text not null,
  source_page integer check (source_page is null or source_page > 0),
  parser_confidence integer not null default 0 check (parser_confidence between 0 and 100),
  status text not null default 'NEEDS_REVIEW' check (status in ('NEEDS_REVIEW','APPROVED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_document_id, discipline_code, edital_code)
);

create index if not exists idx_syllabus_candidates_source
  on public.syllabus_candidates(source_document_id, discipline_code, edital_code);

alter table public.syllabus_candidates enable row level security;
