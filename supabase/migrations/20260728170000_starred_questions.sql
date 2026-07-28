-- Per-user starred questions — a lightweight boolean marker (row
-- presence = starred) for building a pre-interview review shortlist.
-- Mirrors the `progress` table's row-presence-as-state pattern rather than
-- `priority`'s (no value column needed), plus a timestamp for potential
-- recency sorting later.

create table if not exists public.starred_questions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists starred_questions_user_id on public.starred_questions (user_id);

alter table public.starred_questions enable row level security;

create policy "starred_questions_select_own" on public.starred_questions
  for select using (auth.uid() = user_id);

create policy "starred_questions_insert_own" on public.starred_questions
  for insert with check (auth.uid() = user_id);

create policy "starred_questions_update_own" on public.starred_questions
  for update using (auth.uid() = user_id);

create policy "starred_questions_delete_own" on public.starred_questions
  for delete using (auth.uid() = user_id);

grant all on public.starred_questions to authenticated;
