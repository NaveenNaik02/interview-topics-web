-- Lets signed-in (non-anonymous) users add their own topics and subtopics
-- straight from the app, alongside the static TOPIC_GROUPS curriculum in
-- web/lib/topics.ts. Rows here are merged with that static array at read
-- time (see web/lib/topicsData.ts) so both sources render identically
-- everywhere (dashboard, sidebar, section pages, Add Question's topic and
-- subtopic pickers) — the same relationship ETL-seeded rows already have
-- with user-added rows in `questions`.

create table if not exists public.topic_groups (
  slug        text primary key,
  group_name  text not null,
  blurb       text,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- No FK on questions.topic/file — sections are just metadata (label + which
-- group a topic/file pair belongs to) for topic/file values that don't
-- already exist in the static curriculum. `topic` here is always the parent
-- group's slug (see addSection in web/lib/actions/topics.ts).
create table if not exists public.sections (
  topic       text not null,
  file        text not null,
  label       text not null,
  group_slug  text not null references public.topic_groups (slug) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (topic, file)
);

create index if not exists sections_group_slug on public.sections (group_slug);

alter table public.topic_groups enable row level security;
alter table public.sections enable row level security;

create policy "topic_groups_public_read" on public.topic_groups
  for select using (true);

create policy "sections_public_read" on public.sections
  for select using (true);

create policy "topic_groups_insert_own" on public.topic_groups
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

create policy "sections_insert_own" on public.sections
  for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

grant select on public.topic_groups, public.sections to anon, authenticated;
grant insert on public.topic_groups, public.sections to authenticated;
