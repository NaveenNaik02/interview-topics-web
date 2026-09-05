-- Two behaviour-preserving changes to every owner-scoping policy in `public`:
--
--   1. auth.uid() / auth.jwt() wrapped in a scalar subquery. Bare, they are
--      volatile in that position and Postgres re-parses the JWT once per row;
--      wrapped, the planner hoists them into an InitPlan and evaluates once.
--      Measured locally on `select * from question_counts` at 575 rows:
--      3.9-8.5ms -> 1.1-1.8ms.
--   2. `to authenticated` for policies that still default to `public`. Those
--      are evaluated for anon too, and middleware rejects every request
--      without a real session, so no legitimate caller is ever anon.
--
-- Discovered from pg_policies rather than named literally. The first version of
-- this migration hardcoded the 29 policy names read off the LOCAL database and
-- failed on cloud with `policy "Users can delete their own progress" for table
-- "progress" does not exist` — local is not authoritative for names. This form
-- adapts to whatever policies an environment actually has.
--
-- Idempotent: a policy already wrapped, already `to authenticated`, or with
-- nothing to change produces no statement.

do $$
declare
  p          record;
  new_qual   text;
  new_check  text;
  clauses    text;
  changed    boolean;
begin
  for p in
    select tablename, policyname, qual, with_check, roles
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    changed := false;
    clauses := '';

    -- Only widen role scope for policies that never named one. A policy that
    -- deliberately targets some other role is left alone.
    if p.roles = '{public}' then
      clauses := clauses || ' to authenticated';
      changed := true;
    end if;

    new_qual := p.qual;
    if new_qual is not null then
      if new_qual !~ 'SELECT auth\.uid\(\)' then
        new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      end if;
      if new_qual !~ 'SELECT auth\.jwt\(\)' then
        new_qual := replace(new_qual, 'auth.jwt()', '(select auth.jwt())');
      end if;
      if new_qual is distinct from p.qual then
        changed := true;
      end if;
      clauses := clauses || format(' using (%s)', new_qual);
    end if;

    new_check := p.with_check;
    if new_check is not null then
      if new_check !~ 'SELECT auth\.uid\(\)' then
        new_check := replace(new_check, 'auth.uid()', '(select auth.uid())');
      end if;
      if new_check !~ 'SELECT auth\.jwt\(\)' then
        new_check := replace(new_check, 'auth.jwt()', '(select auth.jwt())');
      end if;
      if new_check is distinct from p.with_check then
        changed := true;
      end if;
      clauses := clauses || format(' with check (%s)', new_check);
    end if;

    if changed then
      raise notice 'rewriting %.%', p.tablename, p.policyname;
      execute format('alter policy %I on public.%I%s', p.policyname, p.tablename, clauses);
    end if;
  end loop;
end $$;
