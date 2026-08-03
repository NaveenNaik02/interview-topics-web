# Owner-scoped content: plan + progress tracker

Working doc for the "every account starts blank, builds its own content" change. Checked off as each step lands; deleted once everything below is done and verified.

## Context

Today every visitor (anonymous, dev-seeded, real accounts) sees ONE shared curriculum: static `TOPIC_GROUPS` (`lib/topics.ts`) merged with dynamic `topic_groups`/`sections`/`questions` DB rows any signed-in user can add. RLS SELECT policies on those three tables are currently `USING (true)` — fully open. We're pivoting so every account sees only what it created, no exceptions (including admin). Separately, the user has real personal prep content tied to an old GitHub-OAuth account (from before this session's new email/Google login) that needs reassigning to their new account once reads are locked down.

**Not doing:** a `topic_groups`/`sections` primary-key redesign (composite per-owner keys) — considered, but the real blocker was the ownership-reassignment problem (Part B), not cross-account slug collisions. Keeping existing global keys; adding a cheap defensive retry instead (step A5).

---

## Part A — Owner-scoped visibility

- [x] **A1. Migration** `supabase/migrations/<ts>_owner_scoped_content_reads.sql` — drop the 3 `USING (true)` SELECT policies on `questions`/`topic_groups`/`sections`, replace with `USING (created_by = auth.uid())` each. No admin bypass. Rows with `created_by IS NULL` (10 seed placeholder topic_groups + ETL questions) become invisible to everyone — accepted, no cleanup needed.
- [x] **A2. `lib/topicsData.ts`** — `getAllGroups()`: swap `supabasePublic` → cookie-based `createClient()`; drop the static `TOPIC_GROUPS` merge entirely; every group/section returned becomes `custom: true`.
- [x] **A3. `lib/parser.ts`** — `countQuestions`, `fetchAllCounts`, `parseSection`: same `supabasePublic` → `createClient()` swap. No manual `created_by` filter needed (RLS does it).
- [x] **A4. `lib/actions/checkDuplicate.ts`** — point the duplicate-lookup query (currently `supabasePublic`, line 41) at the already-created authenticated `supabase` client instead.
- [x] **A5. `lib/actions/topics.ts` `addTopicGroup`** — wrap the insert in a bounded retry (up to 5 attempts) that on a `23505` unique-violation increments a numeric suffix and retries, instead of throwing the raw DB error.
- [x] **A6. `app/(app)/[...path]/page.tsx`** — `generateStaticParams()` → return `[]`; drop the now-stale `export const revalidate = 3600`.
- [x] **A7. `components/DashboardClient.tsx`** — add a minimal empty-state message when `groups.length === 0`, pointing at the existing Add-Topic FAB.

## Part B — One-time ownership reassignment script

- [x] **B0. (found during testing, not in original plan)** `supabase/migrations/20260802130000_service_role_grants.sql` — every table's migration since `init.sql` granted access to `anon`/`authenticated` only, never `service_role` (only `questions` had it). The reassignment script failed with "permission denied" on 8 of 9 tables until this was added. Backfills `grant all ... to service_role` on `topic_groups`, `sections`, `progress`, `priority`, `starred_questions`, `question_position`, `inbox_items`, `set_aside_items`, `user_settings`.
- [x] **B1.** New `scripts/reassign-owner.js` (modeled on `scripts/set-admin.js`'s service-role + `auth.admin.listUsers()` lookup pattern). Usage: `node --env-file=.env.local scripts/reassign-owner.js <from-email> <to-email>`. Reassigns `created_by`/`user_id` across: `questions`, `topic_groups`, `sections`, `progress`, `priority`, `starred_questions`, `question_position`, `inbox_items`, `set_aside_items`. Excludes `user_settings` (fresh per-account preferences, not content). Each table's update runs independently with its own try/catch, prints a per-table row-count summary.

## Verification

- [x] **V1.** Apply migration locally (`supabase db reset` or restart so Docker picks it up) — no errors.
- [x] **V2.** `npm run dev`, fresh account → dashboard shows empty-state, no topic cards.
- [x] **V3.** Add topic + subtopic + question via FAB → appears (own content visible).
- [x] **V4.** Second account (incognito) → does NOT see first account's topic; also lands on empty-state.
- [x] **V5.** Create a topic with a name colliding with another account's → retry-suffix logic handles it gracefully (no thrown error).
- [x] **V6.** Run `reassign-owner.js` locally as a dry run (old GitHub email → new email) → new account's dashboard shows the reassigned content.
- [x] **V7.** `npm run lint` && `npm test`.
- [ ] **V8.** Cloud rollout (`npm run migrate` + running the script against prod) — explicit separate confirmation before doing this, not automatic.

---

_Delete this file once every box above is checked and verified end-to-end._
