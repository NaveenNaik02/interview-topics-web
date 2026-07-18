-- Lets topic/subtopic owners (created_by = auth.uid()) delete their own
-- topic_groups/sections rows, plus an admin override — same shape as
-- questions_delete_own / questions_delete_admin in
-- 20260711190453_question_edit_delete.sql and 20260711194952_admin_question_access.sql.
--
-- Deleting a topic_groups row cascades to its sections (see the FK in
-- 20260715120000_topic_groups.sql), but never touches `questions` — the app
-- layer (web/lib/actions/topics.ts) blocks the delete entirely if any
-- questions are still filed under the topic/subtopic, so nothing gets
-- orphaned.

create policy "topic_groups_delete_own" on public.topic_groups
  for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "topic_groups_delete_admin" on public.topic_groups
  for delete
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

create policy "sections_delete_own" on public.sections
  for delete
  to authenticated
  using (auth.uid() = created_by);

create policy "sections_delete_admin" on public.sections
  for delete
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

grant delete on public.topic_groups, public.sections to authenticated;
