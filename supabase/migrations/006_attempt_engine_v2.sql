alter table public.error_notebook
  alter column error_type drop not null,
  alter column error_type drop default;

create or replace function public.record_question_attempt_v2(
  p_user_id uuid,
  p_question_id uuid,
  p_chosen_option_index smallint,
  p_response_time_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  v_correct boolean;
  v_topic uuid;
  v_progress record;
  v_total integer;
  v_correct_count integer;
  v_wrong_count integer;
  v_mastery numeric(5,2);
  v_review record;
  v_next_review timestamptz;
  v_stage smallint;
begin
  select id, syllabus_item_id, correct_option_index, validation_status, origin
    into q
  from public.questions
  where id = p_question_id;

  if q.id is null then
    raise exception 'Questão não encontrada';
  end if;

  if q.correct_option_index is null then
    raise exception 'Questão sem gabarito validado';
  end if;

  if q.origin = 'REAL' and q.validation_status <> 'VALIDATED_REAL' then
    raise exception 'Questão real ainda não validada';
  end if;

  if q.origin <> 'REAL' and q.validation_status not in ('VALIDATED_INTERNAL','VALIDATED_REAL') then
    raise exception 'Questão ainda não validada';
  end if;

  v_correct := p_chosen_option_index = q.correct_option_index;
  v_topic := q.syllabus_item_id;

  insert into public.question_attempts (
    user_id, question_id, syllabus_item_id, chosen_option_index, is_correct, response_time_seconds
  ) values (
    p_user_id, p_question_id, v_topic, p_chosen_option_index, v_correct, p_response_time_seconds
  );

  if v_topic is not null then
    select * into v_progress
    from public.topic_progress
    where user_id = p_user_id and syllabus_item_id = v_topic
    for update;

    v_total := coalesce(v_progress.questions_answered, 0) + 1;
    v_correct_count := coalesce(v_progress.correct_answers, 0) + case when v_correct then 1 else 0 end;
    v_wrong_count := coalesce(v_progress.wrong_answers, 0) + case when v_correct then 0 else 1 end;
    v_mastery := round((v_correct_count::numeric / greatest(v_total, 1)) * 100, 2);

    insert into public.topic_progress (
      user_id, syllabus_item_id, studied, questions_answered, correct_answers, wrong_answers,
      mastery_score, evidence_count, recurrent_errors, last_study_at, updated_at
    ) values (
      p_user_id, v_topic, true, 1,
      case when v_correct then 1 else 0 end,
      case when v_correct then 0 else 1 end,
      case when v_correct then 100 else 0 end,
      1,
      case when v_correct then 0 else 1 end,
      now(), now()
    )
    on conflict (user_id, syllabus_item_id) do update set
      studied = true,
      questions_answered = v_total,
      correct_answers = v_correct_count,
      wrong_answers = v_wrong_count,
      mastery_score = v_mastery,
      evidence_count = v_total,
      recurrent_errors = case
        when v_correct then greatest(public.topic_progress.recurrent_errors - 1, 0)
        else public.topic_progress.recurrent_errors + 1
      end,
      last_study_at = now(),
      updated_at = now();

    select * into v_review
    from public.review_schedule
    where user_id = p_user_id and syllabus_item_id = v_topic
    for update;

    if not v_correct then
      v_stage := 0;
      v_next_review := now() + interval '1 day';
    elsif v_review.id is null then
      v_stage := 0;
      v_next_review := now() + interval '1 day';
    elsif v_review.stage <= 0 then
      v_stage := 1;
      v_next_review := now() + interval '7 days';
    else
      v_stage := least(v_review.stage + 1, 3);
      v_next_review := case
        when v_review.stage = 1 then now() + interval '30 days'
        else now() + interval '60 days'
      end;
    end if;

    insert into public.review_schedule (
      user_id, syllabus_item_id, stage, next_review_at, last_result, review_count, last_review_at, updated_at
    ) values (
      p_user_id, v_topic, v_stage, v_next_review,
      case when v_correct then 'CORRECT' else 'WRONG' end,
      1, now(), now()
    )
    on conflict (user_id, syllabus_item_id) do update set
      stage = v_stage,
      next_review_at = v_next_review,
      last_result = case when v_correct then 'CORRECT' else 'WRONG' end,
      review_count = public.review_schedule.review_count + 1,
      last_review_at = now(),
      updated_at = now();
  end if;

  if not v_correct then
    insert into public.error_notebook (
      user_id, question_id, syllabus_item_id, error_type, error_count, first_error_at, last_error_at
    ) values (
      p_user_id, p_question_id, v_topic, null, 1, now(), now()
    )
    on conflict (user_id, question_id) do update set
      error_type = null,
      error_count = public.error_notebook.error_count + 1,
      last_error_at = now(),
      resolved_at = null;
  end if;

  return jsonb_build_object(
    'question_id', p_question_id,
    'is_correct', v_correct,
    'correct_option_index', q.correct_option_index,
    'needs_error_classification', not v_correct,
    'next_review_at', v_next_review,
    'review_stage', v_stage
  );
end;
$$;

revoke all on function public.record_question_attempt_v2(uuid, uuid, smallint, integer) from public;
