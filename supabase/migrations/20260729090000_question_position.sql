-- Per-user manual question ordering within a section (drag-to-reorder).
-- Row-presence is not the signal here (unlike `starred_questions`/`progress`)
-- since every dragged question needs an explicit rank — closer in shape to
-- `priority`, but with an integer position instead of an enum level.
-- Position values are only ever compared between questions the caller has
-- already scoped to one section, so no topic/file column is needed here.

create table if not exists public.question_position (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  position    integer not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists question_position_user_id on public.question_position (user_id);

alter table public.question_position enable row level security;

create policy "question_position_select_own" on public.question_position
  for select using (auth.uid() = user_id);

create policy "question_position_insert_own" on public.question_position
  for insert with check (auth.uid() = user_id);

create policy "question_position_update_own" on public.question_position
  for update using (auth.uid() = user_id);

create policy "question_position_delete_own" on public.question_position
  for delete using (auth.uid() = user_id);

grant all on public.question_position to authenticated;
