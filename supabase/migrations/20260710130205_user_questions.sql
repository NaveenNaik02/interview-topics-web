-- Lets signed-in (non-anonymous) users add their own questions straight from
-- the app, alongside the ETL-seeded content. ETL rows keep created_by null.
-- The is_anonymous check blocks Supabase anonymous-auth sessions (used for
-- anonymous progress tracking, see ProgressContext) from writing here, since
-- those sessions still carry the `authenticated` role.

alter table public.questions add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists questions_created_by on public.questions (created_by);

create policy "questions_insert_own" on public.questions
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

grant insert on public.questions to authenticated;
