-- Add Question modal redesign (design/add-question.jsx): lets a question
-- carry a code-language hint, free-text tags (both just AI-generation
-- context, not shown in the UI), and a problem statement. `problem` being
-- non-empty is what switches QuestionItem to the Problem -> Solution rail
-- layout instead of a plain answer — there's no separate boolean column.

alter table public.questions add column if not exists lang text;
alter table public.questions add column if not exists tags text;
alter table public.questions add column if not exists problem text;
