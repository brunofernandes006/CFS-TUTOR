alter table if exists public.source_documents
  add column if not exists extraction_status text not null default 'PENDING_EXTRACTION',
  add column if not exists text_excerpt text,
  add column if not exists ingestion_error text;

create index if not exists idx_source_documents_extraction
  on public.source_documents(extraction_status);
