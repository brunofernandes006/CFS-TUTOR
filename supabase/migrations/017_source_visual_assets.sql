create table if not exists public.source_visual_assets (
  id uuid primary key default gen_random_uuid(),
  asset_key text not null unique,
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  source_page integer not null check (source_page > 0),
  mime_type text not null check (mime_type in ('image/png','image/jpeg','image/webp')),
  data_base64 text not null,
  created_at timestamptz not null default now()
);

alter table public.source_visual_assets enable row level security;

alter table public.questions
  add column if not exists source_visual_asset_id uuid references public.source_visual_assets(id) on delete set null;

alter table public.question_candidates
  add column if not exists source_visual_asset_id uuid references public.source_visual_assets(id) on delete set null;

create index if not exists idx_questions_visual_asset on public.questions(source_visual_asset_id);
