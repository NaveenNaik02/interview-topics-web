-- Content is now owner-scoped (created_by = auth.uid(), see
-- 20260802120000_owner_scoped_content_reads.sql) — a question is only ever
-- visible to the account that created it, so starred_questions.user_id /
-- priority.user_id are always redundant with questions.created_by. Folding
-- both into columns on questions removes two tables, two RLS policy sets,
-- and every join needed to attach them to a question.

alter table public.questions add column starred boolean not null default false;
alter table public.questions add column priority text check (priority in ('high', 'med', 'low'));

update public.questions q
set starred = true
from public.starred_questions s
where q.id = s.question_id and q.created_by = s.user_id;

update public.questions q
set priority = p.level
from public.priority p
where q.id = p.question_id and q.created_by = p.user_id;

create index if not exists questions_created_by_starred on public.questions (created_by) where starred;
create index if not exists questions_created_by_priority on public.questions (created_by) where priority is not null;

drop table if exists public.starred_questions;
drop table if exists public.priority;
