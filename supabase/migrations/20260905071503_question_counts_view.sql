-- One grouped read to replace the full-table scan behind `fetchAllCounts()`,
-- which selected `topic, file` for every question the caller owns and counted
-- them in JavaScript. Two independent reasons (see OPTIMIZATION_PLAN.md 1.1):
--
--   1. Correctness. PostgREST truncates every response at `max_rows` — 1000
--      here (supabase/config.toml, and PGRST_DB_MAX_ROWS on the rest
--      container). Past that the old query returned a silently truncated set,
--      so dashboard and sidebar counts undercounted with no error surfaced.
--   2. Payload. `fetchAllCounts()` runs from app/(app)/layout.tsx, so it fired
--      on every authenticated navigation and shipped every question row to
--      compute one integer per subtopic. This view returns one row per
--      subtopic instead, and stops growing with the library.
--
-- security_invoker = true is the load-bearing part: the view executes under
-- the CALLER's privileges, so the owner-scoped SELECT policy on `questions`
-- (20260802120000_owner_scoped_content_reads.sql) filters rows *before* the
-- grouping and each account only ever counts its own questions. Without it a
-- view runs as its owner and would be a read bypass around that policy —
-- exactly the "never reach around RLS on a read path" rule in CLAUDE.md.

create or replace view public.question_counts
with (security_invoker = true) as
  select
    topic,
    file,
    count(*)::int as count
  from public.questions
  group by topic, file;

-- `authenticated` only — deliberately NOT `anon`, unlike the older grant on
-- `questions` itself (20240101000000_init.sql). Anonymous auth was removed
-- and middleware rejects every request without a real session, so no
-- legitimate caller is ever the `anon` role. Granting it anyway would only
-- widen the blast radius if the security_invoker flag above were ever lost:
-- with the grant, anon reads every account's counts with nothing but the
-- public anon key; without it, anon gets 42501 permission denied before RLS
-- is even consulted. GRANT is the table-level gate, RLS is the row-level
-- one — this keeps both shut rather than relying on RLS alone.
--
-- `service_role` is omitted by intent, not oversight: it has BYPASSRLS but no
-- SELECT grant here, and nothing reads counts with the service key. BYPASSRLS
-- does not imply the privilege, so add the grant if a script ever needs it —
-- until then it fails with 42501.
grant select on public.question_counts to authenticated;