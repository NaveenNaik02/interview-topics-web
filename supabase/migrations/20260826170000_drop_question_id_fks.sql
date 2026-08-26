-- Cloud-only schema drift: progress.question_id carried a hand-added foreign
-- key to questions(id) that no migration in this repo ever declared, so it
-- existed in the cloud project and nowhere else. Local Docker Supabase (built
-- from these files) never had it, which is why the failure only ever showed up
-- in production.
--
-- Why it breaks: updateQuestion/moveQuestion deliberately mint a NEW id when a
-- question changes section (lib/actions/questions.ts — ids are namespaced as
-- "{topic}/{file}/u-{uuid}" and per-section progress counts read that prefix),
-- then migrate the caller's rows onto the new id via carryOverUserRows. The FK
-- rejected the UPDATE before that cleanup could run:
--
--   ERROR 23503: update or delete on table "questions" violates foreign key
--   constraint "progress_question_id_fkey" on table "progress"
--
-- Orphaned question_ids are expected by design here: carryOverUserRows only
-- migrates the acting user's own rows, and deleteQuestion's cleanup is
-- explicitly best-effort, so referential integrity on question_id was never
-- something this schema intended to enforce.
--
-- Dropping every FK that points at questions(id) rather than naming one: the
-- same hand-added constraint may exist on question_position/inbox_items/
-- set_aside_items under names this repo has no record of. No migration here
-- creates any of them, so anything found is drift by definition.

do $$
declare
  fk record;
begin
  for fk in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where confrelid = 'public.questions'::regclass
      and contype = 'f'
  loop
    raise notice 'dropping % on %', fk.conname, fk.tbl;
    execute format('alter table %s drop constraint %I', fk.tbl, fk.conname);
  end loop;
end $$;
