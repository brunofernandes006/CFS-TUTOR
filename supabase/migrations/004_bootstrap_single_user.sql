insert into public.app_users (id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Aluno CFS')
on conflict (id) do nothing;
