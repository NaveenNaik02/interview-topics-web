-- Backfills topic_groups rows for the static TOPIC_GROUPS curriculum
-- (web/lib/topics.ts) — those groups were never persisted anywhere (ETL only
-- writes to `questions`), so addSection's insert into `sections` violated
-- the group_slug -> topic_groups(slug) FK (20260715120000_topic_groups.sql)
-- whenever a user added a subtopic under an existing static topic instead of
-- a freshly-created one.
--
-- created_by stays NULL — nobody "owns" these placeholder rows, so
-- topic_groups_delete_own (auth.uid() = created_by) can never match them;
-- only an admin can remove one.
insert into public.topic_groups (slug, group_name, blurb, created_by)
values
  ('javascript',   'JavaScript',   'Core language — scope, types, async, engines, and the DOM.', null),
  ('react',        'React',        'Hooks, rendering, architecture, and the wider ecosystem.', null),
  ('node',         'Node.js',      'Runtime, Express, and GraphQL.', null),
  ('sql',          'SQL',          'Queries, joins, indexes, and database design.', null),
  ('next',         'Next.js',      'App Router, server components, rendering modes.', null),
  ('css',          'CSS',          'Layout, specificity, and modern features.', null),
  ('typescript',   'TypeScript',   'Types, generics, narrowing.', null),
  ('ai',           'AI',           'LLMs, tooling, and agentic patterns.', null),
  ('html',         'HTML',         'Semantics and accessibility.', null),
  ('professional', 'Professional', 'Behavioral and engineering process questions.', null)
on conflict (slug) do nothing;
