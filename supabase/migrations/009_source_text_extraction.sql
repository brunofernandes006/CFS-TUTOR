create table if not exists public.source_extractions (
  source_document_id uuid primary key references public.source_documents(id) on delete cascade,
  full_text text not null default '',
  char_count integer not null default 0 check (char_count >= 0),
  page_count integer,
  extractor text not null,
  extracted_at timestamptz not null default now()
);

create table if not exists public.source_document_pages (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  page_text text not null default '',
  char_count integer not null default 0 check (char_count >= 0),
  created_at timestamptz not null default now(),
  unique(source_document_id, page_number)
);

create index if not exists idx_source_document_pages_document
  on public.source_document_pages(source_document_id, page_number);

alter table public.source_extractions enable row level security;
alter table public.source_document_pages enable row level security;
