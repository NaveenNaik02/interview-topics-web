# Optimization Plan

Findings from a read-only audit on 2026-09-05, extended 2026-09-11. **Phase 1 is
fully applied, local and cloud**; 2.1 is dropped, 2.2/2.3/2.4 are applied, 2.5 is
open, and Phase 3 is applied except 3.4. Per-item `[x]` marks in the body are
authoritative — trust those over this paragraph.

Cloud migrations went out via the `deploy.yml` pipeline on 2026-09-05T17:08Z (run
`33979965062`), not by hand. The run ten minutes earlier failed on exactly this
migration — cloud's policy names differed from local's — which is what commit
`42338ee` ("discover RLS policies instead of naming them literally") fixed. Deploys
since report `No pending migrations.`

> An earlier version of this header said cloud was still pending. It was written
> before that same day's deploy and never updated, and it misled a later reader into
> re-recommending work that was already done. **When an item lands, update its status
> here in the same change.**

Each item states the **issue**, the **fix**, and the **impact** so the item can be
judged on its own and dropped without affecting the others.

Ordering is by payoff, not by effort. Phase 1 contains a latent data-correctness
bug; everything after it is performance or cleanup.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` dropped

---

## Phase 0 — Measured baseline

Measured against the local Docker DB on 2026-09-05 (`supabase_db_interview`), which
is a `pull-remote` mirror of cloud, so cloud should be in the same range.

| Metric                                     | Value                                 |
| ------------------------------------------ | ------------------------------------- |
| `questions` rows                           | **575**                               |
| `sections`                                 | 47 (46 with at least one question)    |
| `topic_groups`                             | 11                                    |
| `progress` / `question_position`           | 226 / 39                              |
| PostgREST `max_rows`                       | **1000** (`supabase/config.toml:18`)  |
| Headroom before silent truncation          | **~425 questions**                    |
| `fetchAllCounts()` payload, per navigation | **25 kB** (575 rows → 46 integers)    |
| `SearchResults` payload, first search      | **685 kB** (581 kB of it `body_html`) |

**Decision gate — resolved: Phase 1 is urgent.** At 575/1000 the account is 57.5% of
the way to the ceiling. Roughly one more large topic and counts start silently
undercounting. Do Phase 1 before it becomes a bug report.

Still outstanding, developer-only (agents must not touch cloud):

- [ ] **0.1** Confirm cloud `count(*) from questions` — expected near 575, but the
      local mirror can lag.
- [ ] **0.2** Confirm the cloud project's `max_rows` under API Settings. It defaults
      to 1000 but is independently configurable.

---

## Phase 1 — The counts bug (correctness + the biggest per-request payload)

Items 1.1 and 1.2 share one root cause and one fix, so they are one unit of work.

> **Read 1.4 first.** It was found last but has the highest measured impact in this
> document — 8x on every RLS-filtered query in the app — and it is a mechanical
> one-line-per-policy change.

### 1.1 `fetchAllCounts()` transfers every question row on every request `[x]`

**Issue**

`lib/content/parser.ts:35-51` selects `topic, file` for _all_ of the user's questions
and counts them in JavaScript:

```ts
const { data } = await supabase.from('questions').select('topic, file');
// ...then counts in a forEach
```

It is called from `app/(app)/layout.tsx:21`, which wraps every authenticated route.
So this runs on **every page navigation**, and the response grows linearly with the
user's total question count.

Two separate problems ride on that:

1. **Correctness.** PostgREST caps responses at `max_rows` (`supabase/config.toml:18`
   = 1000). Past 1,000 questions the query returns a truncated set with **no error**.
   Dashboard totals and sidebar counts silently undercount. This is the more serious
   half — a wrong number is worse than a slow one.
2. **Payload.** Every navigation re-downloads all 575 rows to compute 46 integers.

The in-code comment ("much faster than 50 separate count queries") is correct about
what it replaced. It is comparing against the wrong alternative — the right one is a
single aggregate.

**Fix**

The obvious one-liner does **not** work. Verified against local Supabase:

```
GET /rest/v1/questions?select=topic,file,id.count()
→ 400 {"code":"PGRST123","message":"Use of aggregate functions is not allowed"}
```

Supabase ships with PostgREST aggregates disabled. Two viable paths:

- **A — `security_invoker` view (recommended).** New migration adding a view that
  groups by `(topic, file)` and returns a count. `security_invoker = true` makes it
  run under the caller's RLS, so owner-scoping is preserved with no app-level filter
  — consistent with the "filtering happens in RLS, not app code" rule in `CLAUDE.md`.
  `fetchAllCounts()` then selects from the view. Not subject to `max_rows` in any
  practical sense: one row per subtopic, not per question.
- **B — enable aggregates.** Set `db_aggregates_enabled` locally and the matching
  cloud setting. One config change, no migration — but it widens the API surface for
  every table, and the setting is off by default for a reason. Only worth it if
  aggregates are wanted elsewhere too.

Take A.

**Impact**

- Fixes silent undercounting permanently, at any scale. Currently **425 questions
  away** from breaking (575 of a 1000 ceiling).
- **Two independent reasons to do this, only one of which involves the ceiling.**
  The 25 kB per navigation is a cost paid _today_ at 575 questions — worth fixing
  even if the library never grew again. The 1000 ceiling is the deadline, not the
  justification.
- Per-navigation payload drops from **25 kB to roughly 2 kB** — 575 rows become 46,
  and it stops growing with the library. Measured, not estimated.
- Removes the 575-iteration JS counting loop from every request.
- No UI change. `fetchAllCounts()` keeps its exact signature and return shape, so
  `StoreProvider` and everything downstream are untouched.

**Risk:** low. One new read-only view, one rewritten function body, no schema change
to `questions`. Verify by comparing the view's output to the current function's
output on the same account before switching over.

---

### 1.2 Client-side search silently stops at the same 1,000-row ceiling `[x]`

**Issue**

`components/SearchResults.tsx:112-133` loads the entire question set into browser
memory on mount and filters client-side:

```ts
supabase.from('questions').select('id, title, body_html, topic, file');
```

No `.limit()`, no pagination — so it hits the same `max_rows` truncation as 1.1.
Past the ceiling, search stops finding the user's newest questions and gives no
indication anything is missing.

The transfer cost is the bigger half here, and it is **measured at 685 kB** on the
current 575-question account — 581 kB of that is `body_html`, the heaviest column in
the table, pulled for every question so the browser can substring-match against it.

**Fix**

Two options depending on how much you want to change:

- **Minimal:** add an explicit `.limit()` and a visible "showing first N" affordance.
  Honest, tiny diff, but caps the feature.
- **Better:** move search server-side to a Postgres full-text query (`websearch_to_tsquery`
  against a `tsvector` over title + body), returning only matches. Drops `body_html`
  from the bulk transfer entirely.

Phase 0 settles it: 575 questions and a measured 685 kB transfer. Take the
server-side option. The minimal `.limit()` fix would stop the truncation but leave
the payload untouched, which is the larger problem.

**Impact**

- Removes a silent correctness ceiling on a user-facing feature.
- Server-side path takes first-search transfer from **685 kB to a few kB** — only
  matching rows cross the wire, and `body_html` stops being sent for non-matches.
  This is the single largest transfer in the app.
- Also drops ~685 kB of client memory held for the session.
- Server-side path costs a migration (tsvector column + index) and a rewrite of the
  filtering logic in `SearchResults.tsx`.

**Resolved differently from the recommendation above.** Shipped server-side `ilike`,
not full-text. The recommendation weighed the 685 kB payload — but `ilike` drops that
just as completely, and a full scan of all 575 rows measured **4.6 ms warm**, so the
tsvector column, GIN index and ranking RPC would have bought speed this table does not
need yet. `ilike` also keeps substring matching byte-identical, where full-text would
have stopped matching mid-word (`criptio` -> `description`).

Measured payloads after (same account, 575 questions):

| Search                          | Transferred                   |
| ------------------------------- | ----------------------------- |
| before, _any_ query             | 696 kB                        |
| `memoization`                   | 7 kB                          |
| `useState`                      | 47 kB                         |
| `=>` (entity-widened prefilter) | 333 kB                        |
| `&&` (worst case)               | 696 kB — no worse than before |

**One trap found and fixed during implementation.** The client filter matched against
_stripped_ text while `ilike` matches raw `body_html`, where `>` is stored as `&gt;`.
Searching `=>` returned 108 of 117 real matches — nine arrow-function questions silently
missing. `& < >` are now mapped to `%` in the prefilter, and the existing client-side
substring filter narrows the widened result back to the exact set. Verified in the
browser: `=>` returns 117, matching the old behaviour exactly.

Revisit full-text if the library reaches roughly 10k questions, or if the widened
prefilter for symbol-heavy queries becomes noticeable.

**Risk:** minimal fix is near-zero risk. Full-text move is a real change to search
behavior — ranking and matching will differ from the current substring filter, which
users will notice. Do not ship it without trying real queries first.

---

### 1.3 `fetchQuestionPositions()` is unbounded — same shape, third instance `[x]`

**Issue**

`lib/db/questionPosition.ts:23-28` filters by `question_id` only when `questionIds`
is supplied. `lib/stores/slices/questionOrderSlice.ts:32` calls it **without** ids:

```ts
const initial = await questionPositionDb.fetchQuestionPositions(uid);
```

That fetches every manual-order row for the user with no limit — the same unbounded
pattern as 1.1 and 1.2, subject to the same `max_rows` truncation.

**Fix**

Either scope the store's initial load to the current section, or paginate. Given that
2.2 proposes a prefix-based position lookup anyway, the two are worth doing together.

**Impact**

- Currently **39 rows** — nowhere near the ceiling, so this is genuinely not urgent.
- Listed because it is the same defect class, and a silently-truncated order table
  would corrupt drag ordering rather than merely slow it down. Cheap to close while
  2.2 is already touching this code.

**Resolved by deletion, not by scoping or pagination.** The confirmation this item
asked for came back negative: nothing needs a globally-populated `orderStore`. Its
only reader is `useSectionFilters`, which always has the server-seeded `initialOrder`
alongside it (`[...path]/page.tsx` -> `fetchInitialSectionOrder`, already narrowed to
the section's ids). So the sign-in preload was supplying values the section page
fetches anyway, fresher. Removed `loadQuestionOrder` and the unfiltered
`fetchQuestionPositions` wrapper; `fetchQuestionPositionsForIds` now _requires_ ids
rather than accepting `undefined`, so the unbounded query is unspellable rather than
merely unused. `orderStore` starts empty and holds only what the session has dragged
— which is all it was ever needed for, since `bulkUpsertQuestionPosition` doesn't
`revalidatePath` and the seed can be stale for exactly that window.

Verified in the browser: `/react/architecture` (16 saved positions, written in an
earlier session, store necessarily empty) renders in the exact DB order on load.

**Risk:** low. Worth confirming the store does not depend on holding positions for
sections other than the current one.

---

### 1.4 Every RLS policy re-evaluates `auth.uid()` once per row `[x]`

**Issue**

All 18 owner-scoping policies are written as bare function calls:

```sql
create policy questions_select_own on questions
  for select using (created_by = auth.uid());
```

Postgres treats `auth.uid()` as volatile in that position and calls it **per row**,
re-parsing the JWT out of `current_setting()` every time. Wrapping it in a scalar
subquery makes the planner hoist it into an InitPlan and evaluate it once.

This is the top-priority rule in Supabase's own `supabase-postgres-best-practices`
skill (`references/security-rls-performance.md`), which rates it "100x+ faster on
large tables."

Affected: every policy on `questions`, `progress`, `question_position`,
`topic_groups`, `sections`, `inbox_items`, `set_aside_items`, `user_settings`.
Confirmed via `pg_policies` — **29 policies** (not 18; that count missed the admin
policies), zero using the cached form. Six of them call `auth.jwt()` rather than
`auth.uid()`, which has the identical per-row problem. A second defect rides along:
**18 of the 29 have no `TO` clause**, so they default to `public` and are evaluated for
`anon` too — `alter policy` sets the role and the predicate in one statement.

**Fix**

One migration of `alter policy` statements, each wrapping the call:

```sql
alter policy questions_select_own on public.questions
  using (created_by = (select auth.uid()));
```

Mechanical and behaviour-preserving — the predicate is logically identical, only its
evaluation frequency changes.

**Impact — measured, not estimated**

A/B on the app's real query (`select * from question_counts` as an authenticated
caller), with the policy change applied inside a transaction and rolled back:

| Policy style                        | Execution time |
| ----------------------------------- | -------------- |
| `created_by = auth.uid()` (current) | 29.287 ms      |
| `created_by = (select auth.uid())`  | 3.659 ms       |

**8x faster at 575 rows**, and the gap widens as rows grow — the per-row cost is
linear, the cached cost is constant. This lands on _every_ query the app makes,
not one code path, which makes it the highest-leverage item in this document.

It also compounds with 1.1: that fix cut the payload, this one cuts the time spent
producing it.

**Risk:** low. `alter policy` is a metadata change requiring a brief lock per table;
run it off-peak. Note that `alter policy` is on the list of statements Supabase's
schema-diff engine does _not_ track, so this must be a hand-written versioned
migration — it will never be generated for you.

---

## Phase 2 — Latency

### 2.1 `enableOfflineMode()` runs two sequential loops `[-]`

**Moot as of 2026-09-12 — the code is gone.** Offline support was removed entirely
(`offlineSlice.ts`, `offlineSync.ts`, `sw.js` and the rest), so there is no longer
anything here to optimise. Kept for the record; the finding below describes deleted
code.

**Issue**

`lib/stores/slices/offlineSlice.ts:58` awaits one Supabase query **per section**,
serially:

```ts
for (const section of allSections) {
  const { data } = await supabase.from('questions')...
}
```

Then `:89` awaits one `fetch()` **per URL**, also serially. On this account (47 sections,
measured in Phase 0) that is **47 sequential DB round trips followed by 48 sequential
page fetches** — 95 serial network calls before offline mode reports ready.

**Fix**

`Promise.all` over both loops. If hammering the API is a concern, a small bounded
concurrency (e.g. 5-8 at a time) instead — but at 47 items plain `Promise.all` is
fine and is the smaller diff. Keep the existing per-item `try/catch` so one failure
still cannot abort the batch.

**Impact**

- Wall-clock drops from the sum of 95 serial requests to roughly the slowest one.
  At a conservative 100 ms per call that is ~9.5 s today versus well under 1 s.
- Purely a latency change. No behavior change, no schema change, same partial-failure
  semantics.

**Risk:** low. Watch for rate limiting if bounded concurrency is skipped and the
account is large.

---

### 2.2 Section page has an avoidable request waterfall `[x]`

**Issue**

`app/(app)/[...path]/page.tsx:39-53` fetches questions, then **awaits** them before
it can fetch the manual order, because the order query is keyed by question id:

```ts
const [questions, group] = await Promise.all([...]);
const initialOrder = await fetchInitialSectionOrder(questions.map((q) => q.id));
```

That is one serial round trip added to every section navigation. Question ids are
namespaced `{topic}/{file}/u-{uuid}` (per `CLAUDE.md`), so the ids are not actually
needed — the section prefix identifies the same rows.

Separately, `fetchInitialSectionOrder` (`lib/db/questionPositionServer.ts:13`) calls
`getUser()` again, which the layout has already called this request.

**Fix**

Add a prefix-based lookup (`question_id like '{topic}/{file}/%'`) so positions can be
fetched in parallel with `parseSection` inside the existing `Promise.all`. RLS already
scopes `question_position` to the caller, so no user id is needed in the filter.

While in the file: `Promise.all([parseSection(section), Promise.resolve(findGroupForSection(...))])`
wraps a **synchronous** function in `Promise.resolve` for no reason. Drop the wrapper
and call it directly.

**Impact**

- Removes one serial DB round trip from every section navigation — the single most
  frequent action in the app.
- Removes a redundant `getUser()` call per section load.
- Realistic saving is one round trip, not a transformation. Modest but free, and it
  is on the hottest path.

**Applied.** Three changes:

1. `fetchInitialSectionOrder(ids)` became `fetchSectionOrder(section)` in
   `lib/db/questionPositionServer.ts`, keyed on `question_id like '{topic}/{file}/%'`,
   so it joins the existing `Promise.all` instead of waiting on `parseSection`.
2. The `Promise.resolve(findGroupForSection(...))` wrapper is gone; it is a plain
   synchronous call now.
3. The redundant `getUser()` was fixed at the source rather than at this call site:
   `lib/supabase/user.ts` wraps it in React `cache()`. It was worth more than the
   item assumed — `auth.getUser()` validates the JWT against the Auth server, so it
   is a network round trip, and there are **46 call sites** across server components
   and actions with no memoization. The order query no longer needs a user at all;
   RLS scopes `question_position`.

The prefix is escaped for `\`, `%` and `_` before interpolation — the reserved
`code_output` subtopic contains an underscore, which LIKE would otherwise treat as a
single-character wildcard. Verified against the running PostgREST that the escape is
honoured: `node/nod_/%` matches 23 rows, `node/nod\_/%` matches 0.

Verified in the browser: `/react/architecture` (16 saved positions) renders in exact
DB order, and `/javascript/code_output` — the escaping case — renders normally.

**A moved question's stale position row still matches the old section's prefix**, so
the map can contain ids no current question has. Harmless: lookups are by current id,
so an orphaned entry is never read.

**Risk:** low-moderate. The `like` prefix must exactly match the id format, and it
depends on the `{topic}/{file}/` namespacing convention holding. Worth a test that a
moved question's position resolves correctly, since moves mint new ids
(`carryOverProgress` in `lib/actions/questions.ts`).

---

### 2.3 `getAllGroups()` blocks the section queries that don't need it `[x]`

**Issue**

2.2 put `parseSection` and `fetchSectionOrder` in one `Promise.all`, but both still
sat behind `const groups = await getAllGroups()` on the line above — so a section
navigation was three serial hops, not two:

```
proxy  getUser()
  └─ getAllGroups()
       └─ parseSection + fetchSectionOrder
```

Neither query actually depends on `groups`. Both need only `{topic, file}`, and
`findSection` derives those from the URL segments by pure string manipulation
(`topic = segments.slice(0,-1).join('/')`, `file = segments.at(-1)`). `groups` is
needed only _afterwards_, to confirm the section exists and to build prev/next links.

**Fix**

Extract that derivation as `sectionPath(segments)` in `lib/content/topics.ts` and
have `findSection` call it, so there is one source of truth rather than a copy that
can drift. The page then fires all three together.

`parseSection`/`fetchSectionOrder` take `Pick<SectionMeta, 'topic' | 'file'>` — what
they always read — so no fake `label` has to be invented to satisfy the type.

The topic-overview branch got the same treatment: `fetchTopicFlagIds(segments[0])`
no longer waits on `getAllGroups()` either.

**Impact**

- One serial DB round trip removed from every section navigation and every topic
  overview — together, the most frequent actions in the app.
- No schema change, no UI change.

**Speculating on an unverified path is safe here.** RLS scopes `questions` and
`question_position` to the caller, so a path naming no real section returns zero rows
and can never surface another account's data; the existing `notFound()` checks still
reject it before anything renders.

**Risk:** low. The derivation is shared with `findSection`, so the two cannot disagree.

---

### 2.4 Delete `TOPIC_GROUPS` and `scripts/backfill-static-sections.js` `[x]`

**Issue**

`lib/content/topics.ts` carried a 121-line static `TOPIC_GROUPS` array — half the
file — with **zero runtime consumers**. Its only reader was
`scripts/backfill-static-sections.js`, a one-time fixup from the owner-scoped pivot
that had already done its job on cloud.

Worse than dead, it was **stale and load-bearing in the docs**. Measured against the
local DB: the constant described 10 groups / 43 sections; the database held 11 / 47,
including a `cloud` topic the constant had never heard of. In-app authoring writes
straight to Supabase and never touches the file, so drift was structural.

Meanwhile the workspace root `CLAUDE.md` still instructed a three-way manual sync —
`content/`, `TOPIC_GROUPS`, and `etl.js`'s `SECTIONS` — for a constant nothing read.

**Fix**

Delete the constant and the script. Repoint the four comments that named it. Rewrite
the root `CLAUDE.md` sync section to say the database is the only source of the
curriculum, with an explicit **do not re-add a static curriculum constant**.

Also removed: `SectionMeta.custom` / `TopicGroup.custom`. The flag existed only to
distinguish DB rows from static ones; with the static seed gone it was written
unconditionally in `topicsData.ts` and read nowhere. Its comment claimed "only custom
sections can be deleted", but `deleteSection` gates on question count and RLS and
never looked at it — the comment described an intention never implemented.

**Impact**

- `lib/content/topics.ts`: **242 → ~115 lines**, now types and pure helpers only.
- Removes a standing three-way sync obligation from the root `CLAUDE.md`.
- No bundle change: `TOPIC_GROUPS` was already tree-shaken out of the client bundle.
  Verified by grepping `.next/static/` for strings unique to it (`AgilePoint`,
  `ust-global` → 0 hits) against controls that do ship (`Prep Tracker`, `Grey Zone`).

**Risk:** none at runtime — confirmed zero readers before deleting. The one
prerequisite was that the backfill had already run against cloud, which the developer
confirmed on 2026-09-11.

---

### 2.5 `proxy.ts` makes a network auth call on every request `[ ]`

**Issue**

`lib/supabase/middleware.ts:38` calls `auth.getUser()` — a network round trip to
GoTrue — purely to decide serve-or-redirect. `proxy.ts`'s matcher catches nearly
everything including RSC navigations, so this blocks rendering on every page load and
every soft nav. With 2.3 applied it is the **first of the two remaining serial hops**.

**Fix**

`getClaims()` verifies the JWT signature locally via WebCrypto instead of asking the
auth server.

**This is gated on one fact and is a no-op without it.** If the project signs with
the legacy symmetric HS256 secret, `getClaims()` falls back to `getUser()`
internally — same latency, no error, no warning. Only asymmetric (ES256/RS256)
signing keys make it a real change. The local Docker stack is HS256 and always will
be, so **local timings cannot validate this**; it has to be measured against cloud.

**Full write-up in `AUTH_MIDDLEWARE_LATENCY.md`** — why a JWT can be verified without
a network call, the symmetric/asymmetric distinction, the per-request JWKS cache
trap, a code sketch, and the `curl` that settles the gate.

**Impact**

- If asymmetric: removes a network round trip from _every_ request in the app — the
  largest remaining per-navigation win, since nothing else is on literally every path.
- If symmetric: zero. Migrating signing keys becomes the actual prerequisite, which
  is a bigger decision than a middleware tweak.

**Risk:** moderate, and the reason this is still `[ ]`. `middleware.ts:36` warns that
the `getUser()` call is what refreshes an expiring session cookie. `getClaims()` calls
`getSession()` internally, which _should_ preserve that — but "should" is not good
enough for a change that logs everyone out if wrong. Test: sign in, let the access
token pass expiry, navigate, confirm no bounce to `/login`.

---

## Phase 3 — Cleanup

Small, independent, low-risk. Reasonable to do in one sweep — with one exception:
**3.3 is an actual bug**, not a tidy-up, and is the only item here that changes
runtime behavior.

### 3.1 Delete `check_counts.ts` and `lib/supabase/public.ts` `[x]`

**Applied.** Zero-reference grep re-run at deletion time: nothing imports
`check_counts.ts`, and it was still the only importer of `lib/supabase/public.ts`.
Both deleted.

**Issue**

`check_counts.ts` (repo root) is a 9-line throwaway script with **zero references**
anywhere. It is the _only_ importer of `lib/supabase/public.ts`, so both are dead.

`public.ts` is worse than dead — it is misleading. Its comment reads:

```
// Plain anon-key client for public, session-independent reads (e.g. the
// publicly-readable `questions` table).
```

`questions` stopped being publicly readable at the owner-scoped pivot
(`20260802120000_owner_scoped_content_reads.sql`). Any new code reaching for this
"convenient sessionless client" gets zero rows back under RLS, with no error to
explain why. Neither file appears in the `CLAUDE.md` repo layout.

**Fix**

Delete both.

**Impact**

- Removes a documented-as-safe helper that is now a silent-failure trap.
- Two fewer files; no runtime change whatsoever.

**Risk:** none, provided the zero-reference grep is re-run at the time of deletion.

---

### 3.2 Drop two redundant indexes `[x]`

**Applied** — migration `20260905162257_drop_redundant_user_id_indexes.sql`.
The `EXPLAIN` check this item asked for was done first, and needed a second step to
mean anything: with both indexes present the planner picks the narrower standalone
index when forced, so redundancy only shows once they are gone. Dropping them inside
a rolled-back transaction, `progress` falls back to an **Index Only Scan** on
`progress_pkey` (cheaper than what it replaced — the PK covers both columns) and
`question_position` to an Index Scan on its PK. At current row counts the planner
seq-scans regardless.

**Issue**

Both tables have a composite primary key led by `user_id`, plus a standalone index on
`user_id` alone:

| Table               | Primary key              | Redundant index                                                         |
| ------------------- | ------------------------ | ----------------------------------------------------------------------- |
| `progress`          | `(user_id, question_id)` | `progress_user_id` (`20240101000000_init.sql:22`)                       |
| `question_position` | `(user_id, question_id)` | `question_position_user_id` (`20260729090000_question_position.sql:16`) |

Postgres serves `WHERE user_id = ?` from the leading column of the PK's btree index.
The standalone indexes add write cost and storage for no read benefit.

(The equivalents on `priority` and `starred_questions` are already gone — those tables
were dropped in `20260804105557_merge_starred_priority_into_questions.sql`.)

**Fix**

One migration: `drop index if exists` for both.

**Impact**

- Slightly cheaper writes on the two highest-write tables in the app (every checkbox
  toggle writes `progress`; every drag writes `question_position`).
- Small storage reduction.
- Honestly: a marginal win. Worth doing because it is two lines and removes confusion
  about which index serves what — not because it will be measurable.

**Risk:** low, but verify with `EXPLAIN` on the real query shapes before dropping,
in case any query filters on `user_id` in a way that benefits from the narrower index.

---

### 3.3 `setAside.ts` writes to two tables that no longer exist `[x]`

**Applied.** Both blocks removed and the stale comment rewritten to say why no
cleanup is needed — `starred`/`priority`/`grey_zone` are columns on `questions`, so
they go with the row. Confirmed against the running PostgREST that the calls really
were failing silently:

```
DELETE /rest/v1/priority          -> 404 PGRST205
DELETE /rest/v1/starred_questions -> 404 PGRST205
DELETE /rest/v1/progress          -> 204
```

`deleteQuestion` in `lib/actions/questions.ts` was checked as this item asked and does
**not** carry the same pattern — it touches `progress` and `question_position` only.

**Issue — this one is a live bug, not a cleanup.**

`lib/actions/setAside.ts:71-80` issues deletes against `priority` and
`starred_questions`:

```ts
await supabase.from('priority').delete()...
await supabase.from('starred_questions').delete()...
```

Both tables were **dropped** in
`20260804105557_merge_starred_priority_into_questions.sql`. Confirmed against the
local DB:

```
select to_regclass('public.priority'), to_regclass('public.starred_questions');
→ f | f
```

These are the only two references to either table left in the codebase. It has gone
unnoticed because the return value is discarded — `await supabase...delete()` resolves
with an `{ error }` that nothing reads, so both calls fail silently on every
set-aside.

**Fix**

Delete both blocks. The cleanup they were written to perform is now unnecessary:
`starred` and `priority` are columns on `questions`, so they are removed with the
question row itself. Update the stale comment above them, which still describes
"progress/priority/starred rows."

**Impact**

- Removes two failing round trips from every set-aside action.
- Removes a silent error from a user-facing path.
- No behavior change — the deletes accomplish nothing today.

**Risk:** none. Verify `deleteQuestion` in `lib/actions/questions.ts` does not carry
the same stale pattern before closing this out.

---

### 3.4 Split `components/PriorityMixClient.tsx` `[ ]`

**Issue**

739 lines — the largest file in the repo by a wide margin (next is 470). It holds
three components: `SubtopicCommandPalette` (:56), `SubtopicPicker` (:182), and the
default export (:244), which alone carries ~12 `useState` hooks.

This is a maintainability issue, not a performance one. No measured render problem.

**Fix**

Lift `SubtopicCommandPalette` and `SubtopicPicker` into
`components/PriorityMix/` alongside the main component. Both are self-contained
— they take props and own their local state. Add a barrel per the `barrel-exports`
convention.

**Impact**

- Three focused files instead of one 739-line one.
- Possible incidental bundle benefit if the palette can later be lazy-loaded, since
  it only renders when opened. Not the reason to do it.
- Zero behavior change.

**Risk:** low, but it is a pure-churn diff that touches a lot of lines and makes
review noisy. Do it alone, not bundled with a behavior change.

---

## Checked and deliberately not on this list

Recorded so these are not re-investigated later.

| Area                                          | Finding                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zustand selectors                             | **Healthy.** Zero selectorless `useAppStore()` calls; `useShallow` used across 20 files. Expected to find re-render problems here; there are none.                                                                                                                                                                                                                   |
| `questions(topic, file)` index                | **Exists** — `20240101000000_init.sql:13`.                                                                                                                                                                                                                                                                                                                           |
| `select('*', { count: 'exact', head: true })` | **Fine.** `head: true` transfers no rows. Used in `parser.ts:29` and `actions/topics.ts:133,165`.                                                                                                                                                                                                                                                                    |
| Route-level caching                           | Correctly avoided. The `generateStaticParams` comment in `[...path]/page.tsx` is accurate about why. See the note below.                                                                                                                                                                                                                                             |
| Sidebar server rendering                      | **Already server-rendered.** `'use client'` marks a hydration boundary, not browser-only execution — the layout seeds the store at construction, so counts and the topic tree are in the first HTML. What remains client-side (`usePathname`, live progress, expand/collapse, drawer) all genuinely needs to be. Converting buys only bundle, and see the row below. |
| `@next/bundle-analyzer`                       | **Do not install.** Next 16 builds with Turbopack, which the plugin detects (`process.env.TURBOPACK`) and then emits no report. Use the built-in `npx next experimental-analyze`, already present in the installed CLI.                                                                                                                                              |

---

## Out of scope: Next.js 16 Cache Components

Not recommended right now — recorded because a documented constraint has expired.

`CLAUDE.md` states that nothing can be cached because `getAllGroups()` reads
`cookies()`, which forces dynamic rendering. That was true. Next.js 16 added
`'use cache: private'`, which **can** read `cookies()` inside a cached function —
precisely the blocker described.

**Re-checked 2026-09-11 against the installed Next 16.2.4, not the docs.** The
conclusion stands, and one assumption turned out weaker than it read:

- `'use cache: private'` **is** present (`node_modules/next/dist/server/config.js`),
  and `cacheComponents` is a real config flag.
- **It does not reduce first-visit server work.** Its own bundled docs are explicit
  that results are _never stored on the server_ — only in the browser's router memory
  for the `stale` window. Same queries, every request. It speeds up _revisits_.
- **`partialPrefetching` is not in 16.2.4** — grepped `node_modules`, canary only. So
  the feature that would let the five `prefetch={false}` opt-outs be undone (their
  comments correctly note a prefetch is a full server render) is unavailable
  regardless, which removes most of the reason to adopt the flag now.
- Enabling `cacheComponents` makes every uncached dynamic access a build error unless
  wrapped in `<Suspense>` or a cache scope. `app/(app)/layout.tsx` reads cookies six
  ways before rendering, so this is a Suspense refactor of the whole shell, not a
  config line. The directive is also still marked `version: experimental`.

**Action: none.** Revisit when `partialPrefetching` ships stable — at that point the
prefetch opt-outs and the private cache land together and the payoff is real. Prefer
2.5 first: it is smaller, not experimental, and helps cold loads rather than revisits.

If this is ever taken up, update the `CLAUDE.md` claim at the same time — it is now
stale.
