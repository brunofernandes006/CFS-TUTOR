alter table public.answer_key_candidates
  add column if not exists is_annulled boolean not null default false;

alter table public.answer_key_candidates
  alter column correct_option_index drop not null;

alter table public.answer_key_candidates
  drop constraint if exists answer_key_candidates_correct_option_index_check;

alter table public.answer_key_candidates
  add constraint answer_key_candidates_correct_option_or_annulled_check
  check (
    (is_annulled = true and correct_option_index is null)
    or
    (is_annulled = false and correct_option_index between 0 and 4)
  );

create index if not exists idx_answer_key_candidates_annulled
  on public.answer_key_candidates(source_document_id, is_annulled, question_number);
