create or replace function public.create_simulation_v2(
  p_user_id uuid,
  p_mode text,
  p_target_questions integer default 30
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_simulation_id uuid;
  v_position integer := 0;
  v_disc record;
  v_available integer;
  v_selected integer;
begin
  if p_mode not in ('OFICIAL','ADAPTATIVO') then
    raise exception 'INVALID_SIMULATION_MODE';
  end if;

  if not exists (select 1 from public.app_users where id = p_user_id) then
    raise exception 'USER_NOT_FOUND';
  end if;

  if p_mode = 'OFICIAL' then
    for v_disc in
      select id, code, name, exam_questions
      from public.disciplines
      where active = true
      order by display_order
    loop
      select count(*) into v_available
      from public.questions q
      where q.discipline_id = v_disc.id
        and q.origin = 'REAL'
        and q.validation_status = 'VALIDATED_REAL'
        and q.correct_option_index is not null;

      if v_available < v_disc.exam_questions then
        return jsonb_build_object(
          'ok', false,
          'error', 'SIMULATION_INSUFFICIENT_QUESTIONS',
          'discipline', v_disc.name,
          'required', v_disc.exam_questions,
          'available', v_available
        );
      end if;
    end loop;
  else
    if p_target_questions < 10 or p_target_questions > 60 then
      raise exception 'INVALID_TARGET_QUESTIONS';
    end if;

    select count(*) into v_available
    from public.questions q
    where q.validation_status in ('VALIDATED_REAL','VALIDATED_INTERNAL')
      and q.correct_option_index is not null;

    if v_available < p_target_questions then
      return jsonb_build_object(
        'ok', false,
        'error', 'SIMULATION_INSUFFICIENT_QUESTIONS',
        'required', p_target_questions,
        'available', v_available
      );
    end if;
  end if;

  insert into public.simulations(user_id, mode, status)
  values (p_user_id, p_mode, 'IN_PROGRESS')
  returning id into v_simulation_id;

  if p_mode = 'OFICIAL' then
    for v_disc in
      select id, exam_questions
      from public.disciplines
      where active = true
      order by display_order
    loop
      insert into public.simulation_questions(simulation_id, question_id, position)
      select v_simulation_id, q.id, v_position + row_number() over (order by random())
      from (
        select id
        from public.questions
        where discipline_id = v_disc.id
          and origin = 'REAL'
          and validation_status = 'VALIDATED_REAL'
          and correct_option_index is not null
        order by random()
        limit v_disc.exam_questions
      ) q;
      v_position := v_position + v_disc.exam_questions;
    end loop;
  else
    insert into public.simulation_questions(simulation_id, question_id, position)
    select v_simulation_id, ranked.id, row_number() over ()
    from (
      select q.id
      from public.questions q
      left join public.topic_progress tp
        on tp.user_id = p_user_id and tp.syllabus_item_id = q.syllabus_item_id
      left join public.exam_incidence ei on ei.syllabus_item_id = q.syllabus_item_id
      where q.validation_status in ('VALIDATED_REAL','VALIDATED_INTERNAL')
        and q.correct_option_index is not null
      order by
        coalesce(tp.mastery_score, 0) asc,
        coalesce(tp.recurrent_errors, 0) desc,
        coalesce(ei.incidence_score, 0) desc,
        random()
      limit p_target_questions
    ) ranked;
  end if;

  select count(*) into v_selected
  from public.simulation_questions
  where simulation_id = v_simulation_id;

  return jsonb_build_object(
    'ok', true,
    'simulation_id', v_simulation_id,
    'mode', p_mode,
    'questions', v_selected
  );
end;
$$;

create or replace function public.answer_simulation_question_v2(
  p_user_id uuid,
  p_simulation_id uuid,
  p_position integer,
  p_chosen_option_index smallint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_status text;
begin
  select s.status into v_status
  from public.simulations s
  where s.id = p_simulation_id and s.user_id = p_user_id;

  if v_status is null then raise exception 'SIMULATION_NOT_FOUND'; end if;
  if v_status <> 'IN_PROGRESS' then raise exception 'SIMULATION_NOT_IN_PROGRESS'; end if;

  select sq.question_id into v_question_id
  from public.simulation_questions sq
  where sq.simulation_id = p_simulation_id and sq.position = p_position;

  if v_question_id is null then raise exception 'SIMULATION_QUESTION_NOT_FOUND'; end if;

  if p_chosen_option_index < 0 or p_chosen_option_index > 9 then
    raise exception 'INVALID_OPTION_INDEX';
  end if;

  update public.simulation_questions
  set chosen_option_index = p_chosen_option_index,
      answered_at = now()
  where simulation_id = p_simulation_id and position = p_position;

  return jsonb_build_object('ok', true, 'position', p_position);
end;
$$;

create or replace function public.finalize_simulation_v2(
  p_user_id uuid,
  p_simulation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_started_at timestamptz;
  v_total integer;
  v_answered integer;
  v_weighted_correct numeric := 0;
  v_weighted_total numeric := 0;
  v_score numeric(6,3);
  v_breakdown jsonb;
begin
  select s.status, s.started_at into v_status, v_started_at
  from public.simulations s
  where s.id = p_simulation_id and s.user_id = p_user_id;

  if v_status is null then raise exception 'SIMULATION_NOT_FOUND'; end if;
  if v_status <> 'IN_PROGRESS' then raise exception 'SIMULATION_NOT_IN_PROGRESS'; end if;

  select count(*), count(*) filter (where chosen_option_index is not null)
    into v_total, v_answered
  from public.simulation_questions
  where simulation_id = p_simulation_id;

  if v_total = 0 then raise exception 'EMPTY_SIMULATION'; end if;

  update public.simulation_questions sq
  set is_correct = (sq.chosen_option_index = q.correct_option_index)
  from public.questions q
  where sq.simulation_id = p_simulation_id and q.id = sq.question_id;

  select
    coalesce(sum(case when sq.is_correct then d.exam_weight else 0 end), 0),
    coalesce(sum(d.exam_weight), 0)
  into v_weighted_correct, v_weighted_total
  from public.simulation_questions sq
  join public.questions q on q.id = sq.question_id
  join public.disciplines d on d.id = q.discipline_id
  where sq.simulation_id = p_simulation_id;

  v_score := case when v_weighted_total > 0 then round((v_weighted_correct / v_weighted_total) * 10, 3) else 0 end;

  update public.simulations
  set status = 'COMPLETED',
      completed_at = now(),
      duration_seconds = greatest(0, extract(epoch from (now() - v_started_at))::integer),
      weighted_score = v_score
  where id = p_simulation_id;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.display_order), '[]'::jsonb)
  into v_breakdown
  from (
    select d.display_order, d.code, d.name as discipline, d.exam_weight as weight,
           count(*)::integer as total,
           count(*) filter (where sq.is_correct)::integer as correct,
           round((count(*) filter (where sq.is_correct)::numeric / nullif(count(*),0)) * 10, 2) as score_0_10
    from public.simulation_questions sq
    join public.questions q on q.id = sq.question_id
    join public.disciplines d on d.id = q.discipline_id
    where sq.simulation_id = p_simulation_id
    group by d.id, d.display_order, d.code, d.name, d.exam_weight
  ) x;

  return jsonb_build_object(
    'ok', true,
    'simulation_id', p_simulation_id,
    'answered', v_answered,
    'total', v_total,
    'weighted_score', v_score,
    'disciplines', v_breakdown
  );
end;
$$;