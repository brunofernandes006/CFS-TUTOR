begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

select is((select count(*)::integer from public.app_users where id = '00000000-0000-4000-8000-000000000001'), 1, 'legacy owner is preserved');
select is((select count(*)::integer from public.source_documents where id::text like '10000000-%'), 2, 'official source pair is preserved');
select is((select count(*)::integer from public.source_relationships where id = '11000000-0000-4000-8000-000000000001'), 1, 'source relationship is preserved');
select is((select count(*)::integer from public.questions where id = '40000000-0000-4000-8000-000000000001' and origin = 'REAL' and validation_status = 'VALIDATED_REAL'), 1, 'traceable real question is preserved');
select is((select count(*)::integer from public.question_attempts where id = '50000000-0000-4000-8000-000000000001'), 1, 'attempt history is preserved');
select is((select count(*)::integer from public.error_notebook where id = '60000000-0000-4000-8000-000000000001'), 1, 'error notebook history is preserved');
select is((select count(*)::integer from public.topic_progress where id = '70000000-0000-4000-8000-000000000001'), 1, 'progress history is preserved');
select is((select count(*)::integer from public.review_schedule where id = '80000000-0000-4000-8000-000000000001'), 1, 'review history is preserved');
select is((select count(*)::integer from public.simulations where id = '90000000-0000-4000-8000-000000000001'), 1, 'simulation header is preserved');
select is((select count(*)::integer from public.simulation_questions where simulation_id = '90000000-0000-4000-8000-000000000001'), 1, 'simulation item is preserved');
select is((select access_key_hash from public.app_users where id = '00000000-0000-4000-8000-000000000001'), repeat('0', 64), 'legacy access hash is unchanged before Auth cutover');

select * from finish();
rollback;
