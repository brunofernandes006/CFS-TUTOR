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