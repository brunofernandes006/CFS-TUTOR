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
        and q.correct_option_index is not null
        and coalesce(q.requires_source_visual, false) = false;

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
      and q.correct_option_index is not null
      and coalesce(q.requires_source_visual, false) = false;

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
          and coalesce(requires_source_visual, false) = false
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
        and coalesce(q.requires_source_visual, false) = false
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

create or replace function public.get_simulation_v2(
  p_user_id uuid,
  p_simulation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sim record;
  v_questions jsonb;
  v_breakdown jsonb;
begin
  select id, mode, status, started_at, completed_at, duration_seconds, weighted_score
    into v_sim
  from public.simulations
  where id = p_simulation_id and user_id = p_user_id;

  if not found then raise exception 'SIMULATION_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'position', sq.position,
      'question_id', q.id,
      'discipline', d.name,
      'origin', q.origin,
      'question_number', q.question_number,
      'context_text', q.context_text,
      'requires_source_visual', q.requires_source_visual,
      'statement', q.statement,
      'options', q.options,
      'chosen_option_index', sq.chosen_option_index,
      'answered', sq.chosen_option_index is not null,
      'is_correct', case when v_sim.status = 'COMPLETED' then sq.is_correct else null end,
      'correct_option_index', case when v_sim.status = 'COMPLETED' then q.correct_option_index else null end,
      'explanation', case when v_sim.status = 'COMPLETED' then q.explanation else null end
    ) order by sq.position
  ), '[]'::jsonb)
  into v_questions
  from public.simulation_questions sq
  join public.questions q on q.id = sq.question_id
  join public.disciplines d on d.id = q.discipline_id
  where sq.simulation_id = p_simulation_id;

  if v_sim.status = 'COMPLETED' then
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
  else
    v_breakdown := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'id', v_sim.id,
    'mode', v_sim.mode,
    'status', v_sim.status,
    'started_at', v_sim.started_at,
    'completed_at', v_sim.completed_at,
    'duration_seconds', v_sim.duration_seconds,
    'weighted_score', v_sim.weighted_score,
    'questions', v_questions,
    'disciplines', v_breakdown
  );
end;
$$;
