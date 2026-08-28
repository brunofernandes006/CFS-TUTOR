revoke all on function public.record_question_attempt_v2(uuid, uuid, smallint, integer) from public, anon, authenticated;
revoke all on function public.create_simulation_v2(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.answer_simulation_question_v2(uuid, uuid, integer, smallint) from public, anon, authenticated;
revoke all on function public.finalize_simulation_v2(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_simulation_v2(uuid, uuid) from public, anon, authenticated;

grant execute on function public.record_question_attempt_v2(uuid, uuid, smallint, integer) to service_role;
grant execute on function public.create_simulation_v2(uuid, text, integer) to service_role;
grant execute on function public.answer_simulation_question_v2(uuid, uuid, integer, smallint) to service_role;
grant execute on function public.finalize_simulation_v2(uuid, uuid) to service_role;
grant execute on function public.get_simulation_v2(uuid, uuid) to service_role;
