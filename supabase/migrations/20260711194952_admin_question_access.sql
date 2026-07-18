-- Lets designated admin accounts edit/delete ANY question, including
-- ETL-seeded ones (created_by null) that no regular user can touch.
--
-- Admin status lives in the user's app_metadata, which only the service
-- role can set (via supabase.auth.admin.updateUserById — see
-- scripts/set-admin.js) — unlike user_metadata, it can't be self-modified
-- by the user through the client SDK, so it's safe to trust in RLS.
--
-- These are additional PERMISSIVE policies on top of the existing
-- questions_update_own / questions_delete_own — Postgres OR's multiple
-- permissive policies together for the same command, so this only ever
-- grants extra access, never narrows the existing owner-scoped policies.

create policy "questions_update_admin" on public.questions
  for update
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false))
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));

create policy "questions_delete_admin" on public.questions
  for delete
  to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false));
