-- Questions table: populated by ETL from Markdown files
create table if not exists public.questions (
  id          text primary key,
  topic       text not null,
  file        text not null,
  number      integer not null,
  title       text not null,
  body_html   text not null,
  label       text not null,
  group_slug  text not null
);

create index if not exists questions_topic_file on public.questions (topic, file);

-- Progress table: tracks per-user question completion
create table if not exists public.progress (
  user_id     uuid not null references auth.users (id) on delete cascade,
  question_id text not null,
  primary key (user_id, question_id)
);

create index if not exists progress_user_id on public.progress (user_id);

-- RLS: users can only read/write their own progress
alter table public.progress enable row level security;

create policy "Users can read their own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own progress"
  on public.progress for delete
  using (auth.uid() = user_id);

-- Questions are publicly readable
alter table public.questions enable row level security;

create policy "Questions are publicly readable"
  on public.questions for select
  using (true);

-- Grant API access (local Supabase does not auto-expose tables)
grant select on public.questions to anon, authenticated;
grant all on public.progress to authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant all on public.questions to service_role;
