-- Every account now sees only content it created — no more shared curriculum
-- or cross-account visibility. Replaces the fully-open SELECT policies with
-- owner-scoped ones. Rows with created_by IS NULL (ETL-seeded questions, the
-- 10 placeholder topic_groups from 20260717120000_seed_static_topic_groups.sql)
-- become invisible to everyone — NULL never matches auth.uid(). No admin
-- bypass: admin accounts are isolated like any other account, same as
-- everyone else.

drop policy if exists "Questions are publicly readable" on public.questions;
create policy "questions_select_own" on public.questions
  for select using (created_by = auth.uid());

drop policy if exists "topic_groups_public_read" on public.topic_groups;
create policy "topic_groups_select_own" on public.topic_groups
  for select using (created_by = auth.uid());

drop policy if exists "sections_public_read" on public.sections;
create policy "sections_select_own" on public.sections
  for select using (created_by = auth.uid());
