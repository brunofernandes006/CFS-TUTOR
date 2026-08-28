create or replace function public.prevent_annulled_real_question()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.origin = 'REAL'
     and new.answer_source_document_id is not null
     and new.question_number is not null
     and exists (
       select 1
       from public.answer_key_candidates akc
       where akc.source_document_id = new.answer_source_document_id
         and akc.question_number = new.question_number
         and akc.is_annulled = true
     ) then
    raise exception 'ANNULLED_QUESTION_CANNOT_BE_VALIDATED_REAL';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_annulled_real_question on public.questions;
create trigger trg_prevent_annulled_real_question
before insert or update of origin, answer_source_document_id, question_number, validation_status
on public.questions
for each row
execute function public.prevent_annulled_real_question();
