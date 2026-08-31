-- Synthetic, non-production fixture used only to prove V2 -> V3 expand/contract upgrades.
update public.app_users
set access_key_hash = repeat('0', 64)
where id = '00000000-0000-4000-8000-000000000001';

insert into public.source_documents (
  id, original_name, sanitized_name, sha256, file_size, mime_type, category,
  confidence, validation_status, destination, detected_year, detected_board,
  is_official, source_authority, validated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001', 'fixture-prova.pdf', 'fixture-prova.pdf',
    repeat('1', 64), 100, 'application/pdf', 'PROVA', 100, 'VALIDATED', 'fixture',
    2025, 'BANCA FIXTURE', true, 'Autoridade sintética de teste', now()
  ),
  (
    '10000000-0000-4000-8000-000000000002', 'fixture-gabarito.pdf', 'fixture-gabarito.pdf',
    repeat('2', 64), 100, 'application/pdf', 'GABARITO', 100, 'VALIDATED', 'fixture',
    2025, 'BANCA FIXTURE', true, 'Autoridade sintética de teste', now()
  );

insert into public.source_relationships (
  id, source_document_id, related_document_id, relationship_type, validated
)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  'PROVA_GABARITO', true
);

insert into public.syllabus_items (
  id, discipline_id, edital_code, title, edital_order, active
)
select
  '20000000-0000-4000-8000-000000000001', id, 'FIXTURE.1',
  'Item sintético de baseline', 1, true
from public.disciplines
where code = 'PORT';

insert into public.exams (
  id, contest, year, board, exam_document_id, answer_key_document_id, status
)
values (
  '30000000-0000-4000-8000-000000000001', 'CFS FIXTURE', 2025, 'BANCA FIXTURE',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'VALIDATED'
);

insert into public.questions (
  id, exam_id, discipline_id, syllabus_item_id, origin, question_number,
  statement, options, correct_option_index, explanation, difficulty,
  source_document_id, answer_source_document_id, source_page, validation_status
)
select
  '40000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001', d.id,
  '20000000-0000-4000-8000-000000000001', 'REAL', 1,
  'Enunciado sintético para validar preservação de histórico.',
  '["A", "B", "C", "D", "E"]'::jsonb, 1,
  'Explicação sintética liberada apenas nos fluxos V2 permitidos.', 1,
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 1, 'VALIDATED_REAL'
from public.disciplines d
where d.code = 'PORT';

insert into public.question_sources (
  id, source_document_id, answer_source_document_id, question_number, source_page, status
)
values (
  '41000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 1, 1, 'VALIDATED_REAL'
);

insert into public.question_attempts (
  id, user_id, question_id, syllabus_item_id, chosen_option_index, is_correct,
  response_time_seconds, answered_at
)
values (
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', 0, false, 30,
  '2026-08-30T12:00:00Z'
);

insert into public.error_notebook (
  id, user_id, question_id, syllabus_item_id, error_type, error_count,
  first_error_at, last_error_at
)
values (
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', 'conhecimento', 1,
  '2026-08-30T12:00:00Z', '2026-08-30T12:00:00Z'
);

insert into public.topic_progress (
  id, user_id, syllabus_item_id, studied, questions_answered, correct_answers,
  wrong_answers, mastery_score, evidence_count, recurrent_errors, last_study_at
)
values (
  '70000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', true, 1, 0, 1, 0, 1, 1,
  '2026-08-30T12:00:00Z'
);

insert into public.review_schedule (
  id, user_id, syllabus_item_id, stage, next_review_at, last_result,
  review_count, last_review_at
)
values (
  '80000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', 0,
  '2026-08-31T12:00:00Z', 'WRONG', 1, '2026-08-30T12:00:00Z'
);

insert into public.simulations (
  id, user_id, mode, status, started_at, completed_at, duration_seconds, weighted_score
)
values (
  '90000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001', 'ADAPTATIVO', 'COMPLETED',
  '2026-08-30T12:00:00Z', '2026-08-30T12:10:00Z', 600, 0
);

insert into public.simulation_questions (
  simulation_id, question_id, position, chosen_option_index, is_correct, answered_at
)
values (
  '90000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001', 1, 0, false,
  '2026-08-30T12:05:00Z'
);
