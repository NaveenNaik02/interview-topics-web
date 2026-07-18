-- Local dev only. Seeds run after migrations on `supabase start` / `db reset`
-- and are NEVER pushed to the hosted project (web/scripts/migrate.js and
-- `supabase db push` only read supabase/migrations/) — so this has no effect
-- on production.
--
-- Lets the default anonymous session add questions locally without GitHub
-- sign-in, so the Add Question flow can be tested without auth setup. The
-- hosted project keeps requiring a real (non-anonymous) sign-in — see
-- questions_insert_own in migrations/20260710130205_user_questions.sql.

drop policy if exists "questions_insert_local_dev" on public.questions;

create policy "questions_insert_local_dev" on public.questions
  for insert
  to authenticated
  with check (auth.uid() = created_by);
