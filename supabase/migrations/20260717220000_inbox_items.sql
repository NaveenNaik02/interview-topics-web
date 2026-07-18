-- "Save for later" capture: a zero-friction inbox for questions jotted down
-- before they've been sorted into a topic/subtopic. Modeled on the
-- progress/priority tables (private per-user data, no admin/shared-content
-- concerns) rather than the questions table — items are write-once
-- (captured, then either discarded or assigned into a real question and
-- deleted), so there's no update policy and no created_by/is_anonymous
-- distinction to enforce.

create table if not exists public.inbox_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists inbox_items_user_id on public.inbox_items (user_id);

alter table public.inbox_items enable row level security;

create policy "inbox_items_select_own" on public.inbox_items
  for select using (auth.uid() = user_id);

create policy "inbox_items_insert_own" on public.inbox_items
  for insert with check (auth.uid() = user_id);

create policy "inbox_items_delete_own" on public.inbox_items
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.inbox_items to authenticated;
