begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname = any(array[
       'answer_key_candidates','app_users','disciplines','error_notebook','exam_incidence',
       'exams','question_attempts','question_candidates','question_sources','questions',
       'review_schedule','simulation_questions','simulations','source_document_pages',
       'source_documents','source_extractions','source_relationships','source_visual_assets',
       'study_sessions','syllabus_candidates','syllabus_items','topic_progress'
     ])),
  22,
  'all 22 V2 public tables exist'
);

select ok(
  (select bool_and(c.relrowsecurity)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname = any(array[
       'answer_key_candidates','app_users','disciplines','error_notebook','exam_incidence',
       'exams','question_attempts','question_candidates','question_sources','questions',
       'review_schedule','simulation_questions','simulations','source_document_pages',
       'source_documents','source_extractions','source_relationships','source_visual_assets',
       'study_sessions','syllabus_candidates','syllabus_items','topic_progress'
     ])),
  'RLS is enabled on every V2 public table'
);

select is(
  (select jsonb_object_agg(code, jsonb_build_array(exam_questions, exam_weight, weighted_share) order by code)
   from public.disciplines),
  '{"MAT":[20,2,20.00],"PORT":[20,3,30.00],"PROF":[20,5,50.00]}'::jsonb,
  'official 20/20/20 distribution and 3/2/5 weights are frozen'
);

select has_column('public', 'app_users', 'access_key_hash', 'legacy access hash remains in V2');
select has_trigger('public', 'questions', 'trg_prevent_annulled_real_question', 'annulled real question guard exists');
select has_column('public', 'answer_key_candidates', 'is_annulled', 'annulment state is explicit');

select ok(not has_function_privilege('anon', 'public.record_question_attempt_v2(uuid,uuid,smallint,integer)', 'EXECUTE'), 'anon cannot execute attempt V2 RPC');
select ok(not has_function_privilege('authenticated', 'public.record_question_attempt_v2(uuid,uuid,smallint,integer)', 'EXECUTE'), 'authenticated cannot execute attempt V2 RPC');
select ok(has_function_privilege('service_role', 'public.record_question_attempt_v2(uuid,uuid,smallint,integer)', 'EXECUTE'), 'service_role executes attempt V2 RPC');
select ok(not has_function_privilege('anon', 'public.create_simulation_v2(uuid,text,integer)', 'EXECUTE'), 'anon cannot create V2 simulation');
select ok(not has_function_privilege('authenticated', 'public.create_simulation_v2(uuid,text,integer)', 'EXECUTE'), 'authenticated cannot create V2 simulation');
select ok(has_function_privilege('service_role', 'public.create_simulation_v2(uuid,text,integer)', 'EXECUTE'), 'service_role creates V2 simulation');
select ok(not has_function_privilege('anon', 'public.answer_simulation_question_v2(uuid,uuid,integer,smallint)', 'EXECUTE'), 'anon cannot answer V2 simulation');
select ok(not has_function_privilege('authenticated', 'public.answer_simulation_question_v2(uuid,uuid,integer,smallint)', 'EXECUTE'), 'authenticated cannot answer V2 simulation');
select ok(has_function_privilege('service_role', 'public.answer_simulation_question_v2(uuid,uuid,integer,smallint)', 'EXECUTE'), 'service_role answers V2 simulation');
select ok(not has_function_privilege('anon', 'public.finalize_simulation_v2(uuid,uuid)', 'EXECUTE'), 'anon cannot finalize V2 simulation');
select ok(not has_function_privilege('authenticated', 'public.finalize_simulation_v2(uuid,uuid)', 'EXECUTE'), 'authenticated cannot finalize V2 simulation');
select ok(has_function_privilege('service_role', 'public.finalize_simulation_v2(uuid,uuid)', 'EXECUTE'), 'service_role finalizes V2 simulation');
select ok(not has_function_privilege('anon', 'public.get_simulation_v2(uuid,uuid)', 'EXECUTE'), 'anon cannot read V2 simulation RPC');
select ok(not has_function_privilege('authenticated', 'public.get_simulation_v2(uuid,uuid)', 'EXECUTE'), 'authenticated cannot read V2 simulation RPC');
select ok(has_function_privilege('service_role', 'public.get_simulation_v2(uuid,uuid)', 'EXECUTE'), 'service_role reads V2 simulation RPC');

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = any(array[
     'record_question_attempt_v2','create_simulation_v2','answer_simulation_question_v2',
     'finalize_simulation_v2','get_simulation_v2'
   ]) and p.prosecdef),
  5,
  'all five V2 domain RPCs remain security definer'
);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = any(array[
     'record_question_attempt_v2','create_simulation_v2','answer_simulation_question_v2',
     'finalize_simulation_v2','get_simulation_v2'
   ]) and 'search_path=public' = any(coalesce(p.proconfig, array[]::text[]))),
  5,
  'all five V2 domain RPCs retain their explicit legacy search_path'
);

select ok(
  exists(
    select 1 from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'questions'
      and pg_get_constraintdef(c.oid) like '%origin%REAL%exam_id%source_document_id%answer_source_document_id%'
  ),
  'real questions require traceable exam and source records'
);

select * from finish();
rollback;
