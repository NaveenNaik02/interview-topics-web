-- Per-user question priority (High / Med / Low). Row absence = unset ("None"),
-- mirroring the `progress` table's row-presence-as-state pattern, but priority
-- needs a value column so it's kept separate from `progress` (which only tracks
-- completion via row presence/absence).

create table if not exists public.priority (
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  level       text not null check (level in ('high', 'med', 'low')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists priority_user_id on public.priority (user_id);

alter table public.priority enable row level security;

create policy "priority_select_own" on public.priority
  for select using (auth.uid() = user_id);

create policy "priority_insert_own" on public.priority
  for insert with check (auth.uid() = user_id);

create policy "priority_update_own" on public.priority
  for update using (auth.uid() = user_id);

create policy "priority_delete_own" on public.priority
  for delete using (auth.uid() = user_id);

grant all on public.priority to authenticated;
