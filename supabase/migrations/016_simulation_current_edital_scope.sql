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
      join public.syllabus_items si on si.id = q.syllabus_item_id and si.active = true
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
    join public.syllabus_items si on si.id = q.syllabus_item_id and si.active = true
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
        select q.id
        from public.questions q
        join public.syllabus_items si on si.id = q.syllabus_item_id and si.active = true
        where q.discipline_id = v_disc.id
          and q.origin = 'REAL'
          and q.validation_status = 'VALIDATED_REAL'
          and q.correct_option_index is not null
          and coalesce(q.requires_source_visual, false) = false
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
      join public.syllabus_items si on si.id = q.syllabus_item_id and si.active = true
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
