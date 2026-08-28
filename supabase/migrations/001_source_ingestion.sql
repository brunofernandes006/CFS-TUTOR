create extension if not exists pgcrypto;

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  sanitized_name text not null,
  stored_name text,
  storage_path text,
  storage_provider text not null default 'supabase',
  sha256 text not null unique,
  file_size bigint not null check (file_size > 0),
  mime_type text not null,
  category text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  validation_status text not null default 'NEEDS_REVIEW',
  destination text not null,
  detected_year integer,
  detected_board text,
  detected_number text,
  is_official boolean not null default false,
  source_authority text,
  publication_date date,
  effective_from date,
  effective_to date,
  edital_cutoff_applicable boolean,
  supersedes_document_id uuid references public.source_documents(id),
  uploaded_at timestamptz not null default now(),
  validated_at timestamptz,
  notes text
);

create index if not exists idx_source_documents_category on public.source_documents(category);
create index if not exists idx_source_documents_validation on public.source_documents(validation_status);
create index if not exists idx_source_documents_exam on public.source_documents(detected_year, detected_board);

create table if not exists public.source_relationships (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  related_document_id uuid not null references public.source_documents(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('PROVA_GABARITO','ALTERA','REVOGA','COMPLEMENTA','SUBSTITUI','VERSAO_DE')),
  confidence integer not null default 100 check (confidence between 0 and 100),
  validated boolean not null default false,
  created_at timestamptz not null default now(),
  unique(source_document_id, related_document_id, relationship_type)
);

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  answer_source_document_id uuid references public.source_documents(id) on delete restrict,
  question_number integer,
  source_page integer,
  status text not null default 'EXTRACTED' check (status in ('EXTRACTED','NEEDS_REVIEW','VALIDATED_REAL','INVALID')),
  created_at timestamptz not null default now()
);

-- O bucket deve ser privado. O backend assina/serve arquivos quando necessário.
insert into storage.buckets (id, name, public)
values ('cfs-fontes', 'cfs-fontes', false)
on conflict (id) do nothing;
