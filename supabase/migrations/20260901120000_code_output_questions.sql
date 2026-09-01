-- Code-output questions: a snippet plus the output it produces, filed under
-- the reserved `code_output` subtopic every topic gets (see lib/topics.ts).
-- `code` is the discriminator — a row with it set renders as a code question
-- instead of a plain answer or a problem/solution rail. `output` and the
-- explanation (body_html/markdown) are both optional, so neither can stand in
-- for that check.

alter table public.questions
  add column code text,
  add column output text;
