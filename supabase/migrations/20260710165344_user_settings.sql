-- Captures the `user_settings` table as a migration. It was previously
-- created by hand (via the dashboard) directly on the hosted project and was
-- never tracked here, so it silently didn't exist on fresh environments
-- (e.g. the local Docker stack) — `if not exists`/idempotent guards below
-- make this a no-op against the hosted project and a real create locally.
-- Schema captured from the hosted project's information_schema/pg_policies.

create table if not exists public.user_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  default_sort      text not null default 'manual',
  remember_filters  boolean not null default true,
  theme             text not null default 'light',
  updated_at        timestamptz default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can manage own settings" on public.user_settings;
create policy "Users can manage own settings" on public.user_settings
  for all
  using (auth.uid() = user_id);

grant all on public.user_settings to anon, authenticated;
