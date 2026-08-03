-- Every table's migration since the original init.sql granted access to
-- anon/authenticated only, never service_role (init.sql granted service_role
-- access to `questions` alone: "grant all on public.questions to
-- service_role"). service_role bypasses RLS but still needs the underlying
-- Postgres table grant — without it, service-role tooling (e.g.
-- scripts/reassign-owner.js) gets "permission denied" on every table but
-- questions. Backfilling the same grant everywhere else.

grant all on public.topic_groups, public.sections to service_role;
grant all on public.progress to service_role;
grant all on public.priority to service_role;
grant all on public.starred_questions to service_role;
grant all on public.question_position to service_role;
grant all on public.inbox_items to service_role;
grant all on public.set_aside_items to service_role;
grant all on public.user_settings to service_role;
