-- Renaming a topic or subtopic is the one content edit neither table allowed:
-- both were granted INSERT/DELETE only, with no UPDATE policy, so an update
-- failed on the grant before RLS was ever consulted.
--
-- Only the display text is writable. `slug` (topic_groups) and (topic, file)
-- (sections) stay put deliberately — question ids are "{topic}/{file}/u-{uuid}",
-- so repointing either would orphan every question and its progress rows. This
-- mirrors updateQuestion, which mints a new id rather than repointing.

grant update on table public.sections to authenticated;
grant update on table public.topic_groups to authenticated;

create policy sections_update_own on public.sections
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy sections_update_admin on public.sections
  for update to authenticated
  using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'is_admin')::boolean, false))
  with check (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'is_admin')::boolean, false));

create policy topic_groups_update_own on public.topic_groups
  for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy topic_groups_update_admin on public.topic_groups
  for update to authenticated
  using (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'is_admin')::boolean, false))
  with check (coalesce((((select auth.jwt()) -> 'app_metadata') ->> 'is_admin')::boolean, false));
