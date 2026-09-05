-- Two mechanical changes to all 29 policies, behaviour-preserving both times.
--
-- 1. auth.uid() / auth.jwt() wrapped in a scalar subquery. Bare, they are
--    volatile in that position and Postgres re-parses the JWT once per row;
--    wrapped, the planner hoists them into an InitPlan and evaluates once.
--    Measured on `select * from question_counts` at 575 rows: 29.3ms -> 3.7ms.
-- 2. `to authenticated` added where the policy defaulted to `public`, which is
--    18 of the 29. They were also being evaluated for anon, which no request
--    is any more (middleware requires a real session).
--
-- alter policy is not tracked by Supabase's schema-diff engine, so this file
-- has to be hand-written — it will never be generated.

alter policy inbox_items_delete_own on public.inbox_items
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy inbox_items_insert_own on public.inbox_items
  to authenticated
  with check (((select auth.uid()) = user_id));
alter policy inbox_items_select_own on public.inbox_items
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy "Users can delete their own progress" on public.progress
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy "Users can insert their own progress" on public.progress
  to authenticated
  with check (((select auth.uid()) = user_id));
alter policy "Users can read their own progress" on public.progress
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy "Users can update their own progress" on public.progress
  to authenticated
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));
alter policy question_position_delete_own on public.question_position
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy question_position_insert_own on public.question_position
  to authenticated
  with check (((select auth.uid()) = user_id));
alter policy question_position_select_own on public.question_position
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy question_position_update_own on public.question_position
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy questions_delete_admin on public.questions
  to authenticated
  using (COALESCE(((((select auth.jwt()) -> 'app_metadata'::text) ->> 'is_admin'::text))::boolean, false));
alter policy questions_delete_own on public.questions
  to authenticated
  using (((select auth.uid()) = created_by));
alter policy questions_insert_own on public.questions
  to authenticated
  with check ((((select auth.uid()) = created_by) AND (COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false)));
alter policy questions_select_own on public.questions
  to authenticated
  using ((created_by = (select auth.uid())));
alter policy questions_update_admin on public.questions
  to authenticated
  using (COALESCE(((((select auth.jwt()) -> 'app_metadata'::text) ->> 'is_admin'::text))::boolean, false))
  with check (COALESCE(((((select auth.jwt()) -> 'app_metadata'::text) ->> 'is_admin'::text))::boolean, false));
alter policy questions_update_own on public.questions
  to authenticated
  using (((select auth.uid()) = created_by))
  with check ((((select auth.uid()) = created_by) AND (COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false)));
alter policy sections_delete_admin on public.sections
  to authenticated
  using (COALESCE(((((select auth.jwt()) -> 'app_metadata'::text) ->> 'is_admin'::text))::boolean, false));
alter policy sections_delete_own on public.sections
  to authenticated
  using (((select auth.uid()) = created_by));
alter policy sections_insert_own on public.sections
  to authenticated
  with check ((((select auth.uid()) = created_by) AND (COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false)));
alter policy sections_select_own on public.sections
  to authenticated
  using ((created_by = (select auth.uid())));
alter policy set_aside_items_delete_own on public.set_aside_items
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy set_aside_items_insert_own on public.set_aside_items
  to authenticated
  with check (((select auth.uid()) = user_id));
alter policy set_aside_items_select_own on public.set_aside_items
  to authenticated
  using (((select auth.uid()) = user_id));
alter policy topic_groups_delete_admin on public.topic_groups
  to authenticated
  using (COALESCE(((((select auth.jwt()) -> 'app_metadata'::text) ->> 'is_admin'::text))::boolean, false));
alter policy topic_groups_delete_own on public.topic_groups
  to authenticated
  using (((select auth.uid()) = created_by));
alter policy topic_groups_insert_own on public.topic_groups
  to authenticated
  with check ((((select auth.uid()) = created_by) AND (COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false) = false)));
alter policy topic_groups_select_own on public.topic_groups
  to authenticated
  using ((created_by = (select auth.uid())));
alter policy "Users can manage own settings" on public.user_settings
  to authenticated
  using (((select auth.uid()) = user_id));
