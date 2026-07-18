-- Lets question owners (created_by = auth.uid()) edit and delete their own
-- questions. ETL-seeded rows (created_by null) are never touched by this —
-- RLS scopes both policies strictly to the creator.

-- Raw Markdown source, so an edit can reload the original text into the
-- editor instead of reverse-engineering it from body_html. ETL rows leave
-- this null (they're rendered via remark at ETL time, never edited here).
alter table public.questions add column if not exists markdown text;

create policy "questions_update_own" on public.questions
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "questions_delete_own" on public.questions
  for delete
  to authenticated
  using (auth.uid() = created_by);

grant update, delete on public.questions to authenticated;
