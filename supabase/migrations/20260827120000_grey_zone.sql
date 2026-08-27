-- Grey Zone: questions the user is still shaky on, pulled out of whatever
-- subtopic they live in. Same shape as `starred` (see
-- 20260804105557_merge_starred_priority_into_questions) — content is
-- owner-scoped, so the flag is a column on the question itself, no join
-- table and no extra RLS policy set.

alter table public.questions add column grey_zone boolean not null default false;

create index if not exists questions_created_by_grey_zone on public.questions (created_by) where grey_zone;
