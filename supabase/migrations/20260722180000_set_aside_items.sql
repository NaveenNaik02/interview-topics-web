-- "Set aside" — the kebab menu's counterpart to Delete for a question you
-- still want, just not here right now. It removes the row from `questions`
-- (same as a delete) but keeps its full content around so it can be
-- reassigned into a different topic/subtopic later from the Inbox's
-- "Set aside" tab, the same way a captured inbox_items row gets assigned via
-- AddQuestionModal. Modeled on inbox_items (private per-user, write-once —
-- discarded or assigned then deleted, so no update policy).

create table if not exists public.set_aside_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  markdown    text not null,
  body_html   text not null,
  lang        text,
  tags        text,
  problem     text,
  topic       text not null,
  file        text not null,
  label       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists set_aside_items_user_id on public.set_aside_items (user_id);

alter table public.set_aside_items enable row level security;

create policy "set_aside_items_select_own" on public.set_aside_items
  for select using (auth.uid() = user_id);

create policy "set_aside_items_insert_own" on public.set_aside_items
  for insert with check (auth.uid() = user_id);

create policy "set_aside_items_delete_own" on public.set_aside_items
  for delete using (auth.uid() = user_id);

grant select, insert, delete on public.set_aside_items to authenticated;
