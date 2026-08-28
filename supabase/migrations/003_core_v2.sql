create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Aluno CFS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disciplines (
  id smallserial primary key,
  code text not null unique,
  name text not null unique,
  exam_questions integer not null check (exam_questions > 0),
  exam_weight integer not null check (exam_weight > 0),
  weighted_share numeric(5,2) not null check (weighted_share > 0 and weighted_share <= 100),
  display_order smallint not null,
  active boolean not null default true
);

insert into public.disciplines (code, name, exam_questions, exam_weight, weighted_share, display_order)
values
  ('PROF', 'Conhecimentos Profissionais', 20, 5, 50.00, 1),
  ('PORT', 'Língua Portuguesa', 20, 3, 30.00, 2),
  ('MAT', 'Matemática', 20, 2, 20.00, 3)
on conflict (code) do update set
  name = excluded.name,
  exam_questions = excluded.exam_questions,
  exam_weight = excluded.exam_weight,
  weighted_share = excluded.weighted_share,
  display_order = excluded.display_order,
  active = true;

create table if not exists public.syllabus_items (
  id uuid primary key default gen_random_uuid(),
  discipline_id smallint not null references public.disciplines(id) on delete restrict,
  edital_code text,
  title text not null,
  parent_id uuid references public.syllabus_items(id) on delete cascade,
  edital_order integer not null default 0,
  source_document_id uuid references public.source_documents(id) on delete set null,
  source_page integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(discipline_id, edital_code)
);

create index if not exists idx_syllabus_discipline on public.syllabus_items(discipline_id, edital_order);
create index if not exists idx_syllabus_parent on public.syllabus_items(parent_id);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  contest text not null default 'CFS',
  year integer not null check (year between 2000 and 2100),
  board text not null,
  exam_document_id uuid references public.source_documents(id) on delete restrict,
  answer_key_document_id uuid references public.source_documents(id) on delete restrict,
  status text not null default 'NEEDS_REVIEW' check (status in ('NEEDS_REVIEW','VALIDATED','INVALID')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contest, year, board)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references public.exams(id) on delete cascade,
  discipline_id smallint not null references public.disciplines(id) on delete restrict,
  syllabus_item_id uuid references public.syllabus_items(id) on delete set null,
  origin text not null check (origin in ('REAL','INEDITA','DIDATICA')),
  question_number integer,
  statement text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_option_index smallint,
  explanation text,
  difficulty smallint check (difficulty between 1 and 5),
  source_document_id uuid references public.source_documents(id) on delete restrict,
  answer_source_document_id uuid references public.source_documents(id) on delete restrict,
  source_page integer,
  validation_status text not null default 'NEEDS_REVIEW' check (validation_status in ('EXTRACTED','NEEDS_REVIEW','VALIDATED_REAL','VALIDATED_INTERNAL','INVALID')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin <> 'REAL' or (exam_id is not null and source_document_id is not null and answer_source_document_id is not null)),
  check (validation_status <> 'VALIDATED_REAL' or origin = 'REAL')
);

create unique index if not exists uq_real_exam_question on public.questions(exam_id, question_number) where origin = 'REAL';
create index if not exists idx_questions_syllabus on public.questions(syllabus_item_id);
create index if not exists idx_questions_discipline on public.questions(discipline_id);
create index if not exists idx_questions_validation on public.questions(validation_status);

create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  syllabus_item_id uuid references public.syllabus_items(id) on delete set null,
  chosen_option_index smallint,
  is_correct boolean not null,
  response_time_seconds integer check (response_time_seconds is null or response_time_seconds >= 0),
  perceived_difficulty smallint check (perceived_difficulty is null or perceived_difficulty between 1 and 5),
  answered_at timestamptz not null default now()
);

create index if not exists idx_attempts_user_time on public.question_attempts(user_id, answered_at desc);
create index if not exists idx_attempts_topic on public.question_attempts(user_id, syllabus_item_id);

create table if not exists public.error_notebook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  syllabus_item_id uuid references public.syllabus_items(id) on delete set null,
  error_type text not null default 'conhecimento' check (error_type in ('conhecimento','esquecimento','interpretacao','distracao','calculo','procedimento','confusao_de_conceitos','pegadinha','estrategia_de_prova','falta_de_tempo')),
  error_count integer not null default 1 check (error_count > 0),
  concept_gap text,
  first_error_at timestamptz not null default now(),
  last_error_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(user_id, question_id)
);

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  syllabus_item_id uuid not null references public.syllabus_items(id) on delete cascade,
  studied boolean not null default false,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  evidence_count integer not null default 0,
  recurrent_errors integer not null default 0,
  last_study_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, syllabus_item_id),
  check (questions_answered = correct_answers + wrong_answers)
);

create table if not exists public.review_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  syllabus_item_id uuid not null references public.syllabus_items(id) on delete cascade,
  stage smallint not null default 0 check (stage between 0 and 4),
  next_review_at timestamptz not null,
  last_result text check (last_result in ('CORRECT','WRONG','PARTIAL')),
  review_count integer not null default 0,
  last_review_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, syllabus_item_id)
);

create index if not exists idx_reviews_due on public.review_schedule(user_id, next_review_at);

create table if not exists public.exam_incidence (
  syllabus_item_id uuid primary key references public.syllabus_items(id) on delete cascade,
  real_questions_count integer not null default 0,
  exams_count integer not null default 0,
  incidence_score numeric(6,3),
  last_recalculated_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  planned_minutes integer check (planned_minutes is null or planned_minutes > 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  notes text
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  mode text not null check (mode in ('OFICIAL','ADAPTATIVO')),
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED','ABANDONED')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer,
  weighted_score numeric(6,3)
);

create table if not exists public.simulation_questions (
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  position integer not null,
  chosen_option_index smallint,
  is_correct boolean,
  answered_at timestamptz,
  primary key (simulation_id, position),
  unique(simulation_id, question_id)
);

-- Somente o backend com service role deve escrever diretamente nestas tabelas na primeira versão.
alter table public.app_users enable row level security;
alter table public.disciplines enable row level security;
alter table public.syllabus_items enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.error_notebook enable row level security;
alter table public.topic_progress enable row level security;
alter table public.review_schedule enable row level security;
alter table public.exam_incidence enable row level security;
alter table public.study_sessions enable row level security;
alter table public.simulations enable row level security;
alter table public.simulation_questions enable row level security;
