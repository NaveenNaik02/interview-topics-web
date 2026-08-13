# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Gemini, etc.) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server at localhost:3000 against LOCAL Docker Supabase
npm run dev:remote   # Start dev server at localhost:3010 against the CLOUD Supabase project
npm run db:start     # supabase start — spins up the local Docker Supabase stack (Postgres/GoTrue/Studio)
npm run db:stop      # supabase stop
npm run build        # Production build (queries Supabase at build time)
npm run start        # Serve production build
```

`npm run dev` sources `.env.local.docker` (points `NEXT_PUBLIC_SUPABASE_URL` at `http://localhost:54321` plus local anon/service keys from `supabase start`) — **local dev runs against a local Docker Supabase instance, not the cloud project.** `npm run dev:remote` sets `DEV_REMOTE=1`, which makes the app read `.env.local` (the real cloud project) instead and builds into `.next-remote` (vs. plain `dev`'s `.next`) so both can run side by side without a build-dir lock conflict (see `next.config.js`).

In dev (`NODE_ENV !== 'production'`), auth signs into a fixed seeded account (`lib/devUser.ts`, `dev@local.test`) instead of an anonymous session — see "Auth & admin roles" below.

ETL lives in the sibling `content/` repo — run from there:

```bash
cd ../content
npm run etl      # Parse all .md files and upsert questions into Supabase
                 # Re-run whenever markdown content changes
```

Note: ETL only ever writes to the `questions` table. Topics/sections added at runtime through the app (see "Dynamic topics" below) live in separate `topic_groups`/`sections` tables and are untouched by ETL.

Requires `.env.local` in `web/` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ACCESS_TOKEN` (personal access token, used by `scripts/migrate.js`'s Management API calls). AI authoring features additionally need a Gemini key (`FREE_GEM_API_KEY`) — see "AI-assisted authoring" below.

```bash
npm run lint       # ESLint (eslint-config-next flat config, eslint.config.mjs)
npm test           # Vitest, run once (vitest.config.ts)
npm run set-admin  # node --env-file=.env.local scripts/set-admin.js <email> [--revoke]
npm run pull-remote # Copy the CLOUD project's data into local Docker Supabase, re-owned to DEV_USER

```

Database schema changes: see "Database Migrations" in the root `CLAUDE.md` — add a `.sql` file to `supabase/migrations/`, then `npm run migrate` from here to apply it to the linked **cloud** project (local dev picks up the same files automatically via `supabase start`).

- **No Direct Remote DB Actions**: Agents **NEVER** act directly on the remote/cloud Supabase project — no `npm run migrate`, no `scripts/set-admin.js` against cloud, no Management API calls, no service-role writes, no SQL against the cloud DB. Write the migration/script and tell the user to run it. Local Docker Supabase is the only DB an agent may touch.
- **No Database Resets**: **NEVER** run database resets (such as `supabase db reset` or any command/script that drops and recreates database tables) under any circumstances, to prevent local development data loss. Database schema updates must always be applied incrementally.

## CI/CD

`.github/workflows/ci.yml` runs `lint` and `test` as separate jobs on every push to `main`.

`.github/workflows/deploy.yml` is manual only (`workflow_dispatch`, run from the Actions tab) — it never fires on push. It runs `node scripts/migrate.js` (applying any pending `supabase/migrations/*.sql` to the linked project) before building and deploying to Vercel production, so the new build never runs against a schema it doesn't expect. Needs the `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` repo secrets in addition to the existing Vercel ones.

## Architecture

This is a **Next.js 16 App Router** application (React 19) backed by **Supabase** (Postgres). Content, progress, and now a growing set of user-authored/curated data (topics, inbox, starred, set-aside, priority, question order, settings) all live in the database — there is no runtime dependency on local Markdown files except during ETL.

### Content loading & routing

- `lib/parser.ts` (`server-only`) queries Supabase. `countQuestions`/`parseSection` hit the `questions` table, populated by `scripts/etl.js` (which renders HTML via `remark` at ETL time, not query time) plus any questions authored directly in the app (HTML rendered via `marked` + `isomorphic-dompurify` at write time instead — see below).
- Catch-all route `app/(app)/[...path]/page.tsx` handles `/{slug}` (topic overview, auto-redirects single-section groups) and `/{topic}/{file}` (section view), resolving the curriculum through `getAllGroups()` (see "Dynamic topics").
- **Nothing is prerendered.** Content is per-account (see "Owner-scoped content"), so `generateStaticParams()` returns `[]` and every path renders on demand. `getAllGroups()` reads `cookies()` via `createClient()`, which both forces dynamic rendering (so there's no shared cache entry that could serve one account's topics to another) and makes build-time evaluation impossible. Don't add `export const revalidate` to these routes. Server actions that mutate content (`lib/actions/questions.ts`, `topics.ts`, `setAside.ts`) still `revalidatePath` the section and its topic overview.
- Four extra top-level routes sit alongside the catch-all, each a small server component: `app/inbox/page.tsx` and `app/settings/page.tsx` do no server fetch (their data lives client-side in the Zustand store); `app/priority-mix/page.tsx` and `app/starred/page.tsx` fetch the user's rows + a `questions` join server-side before handing assembled data to their client component.

### State management: one store per request tree

App state lives in a single Zustand store composed from 9 slices (`lib/stores/slices/*.ts`: auth, progress, priority, settings, inbox, setAside, starred, offline, questionOrder — types in `lib/stores/types.ts`).

- **The store is NOT a module singleton.** `lib/stores/appStore.ts` exports `createAppStore(init)` (`createStore` from `zustand/vanilla`) plus a `StoreContext`; `lib/stores/StoreProvider.tsx` constructs one per tree via a `useState` lazy initializer and provides it. A module-level `create()` in a Next server process is shared across every request — with owner-scoped content that's a cross-account leak waiting for the first render-phase write.
- **Server data is seeded at construction, not by an effect.** `app/(app)/layout.tsx` passes `getAllGroups()` + `fetchAllCounts()` into `<StoreProvider groups totals>`, so `groups`/`totals`/`stats` are correct on the very first render. This is why the old `TopicsContext`/`TotalsContext`/`StoreBootstrap` trio is gone — they existed only to paper over the store being one render behind.
  - `totals` is deliberately seeded once and never re-synced: `setSectionTotal()` refines it as sections mount, and re-seeding from the server value would wipe those refinements.
  - `groups` _is_ re-synced by a `StoreProvider` effect — it's a fresh server value on every `router.refresh()`, which is how a newly added topic/subtopic reaches the tree.
  - `initAuth`/`initOfflineState`/`initSettingsFromLocalStorage` stay in effects — they read `localStorage` and register subscriptions, which are effects on their own merits, not hydration workarounds.
- **Consuming it**: `useAppStore(selector)` (same signature as the old singleton hook, `useShallow` works unchanged), or `useAppStoreApi()` for imperative `getState`/`subscribe` outside render. There is no importable store instance — slices reach their own state via `get()`.
- **Plain Context still owns client-only UI state**: `UIContext` (drawer/search), `ThemeContext`, `FontSizeContext` — self-contained Context+`useState`, no server dependency, no reason to be in the store.

### Auth & admin roles

- Regular users get Supabase **anonymous auth** as before. In **dev**, `lib/devUser.ts` provides a fixed seeded account (`dev@local.test`) that `authSlice.initAuth()` signs into instead (`signInWithPassword`, falling back to `signUp` — safe because the local stack has email confirmation disabled). This means dev always has a real, non-anonymous account, so every authoring action can use one universal rule — "must be signed in and not anonymous" — with zero per-environment branching inside the actions themselves.
- **Admin status** is stored in `app_metadata.is_admin` (never `user_metadata` — `app_metadata` can only be set by the service role, so it's safe to trust inside RLS policies). Granted via `npm run set-admin <email>` (`scripts/set-admin.js`). Migrations `20260711194952_admin_question_access.sql` / `20260716120000_topic_delete.sql` add permissive `_admin` RLS policies (Postgres ORs multiple permissive policies) letting admins edit/delete any question or topic, including ETL-seeded rows (`created_by IS NULL`, untouchable by regular users). Client-side, `user.app_metadata?.is_admin === true` gates the same actions alongside `createdBy === user.id` ownership checks (`SectionClient`, `StarredClient`, `PriorityMixClient`). Those `_admin` policies cover writes only — **SELECT has no admin bypass** since `20260802120000_owner_scoped_content_reads.sql`, so an admin can't read (and therefore can't reach) another account's rows.
- Authoring server actions (add/edit/delete question, add topic/section, AI generation) are gated behind **signed-in AND not anonymous** via a shared `requireAuthor()`-style check — anonymous users can still track progress/priority/starred/inbox, just not create shared content.

### Owner-scoped content

`20260802120000_owner_scoped_content_reads.sql` made every account see only content it created: the open SELECT policies on `questions`/`topic_groups`/`sections` were replaced with `created_by = auth.uid()`. There is no shared curriculum and no admin read bypass — admins are isolated like anyone else, and rows with `created_by IS NULL` (ETL-seeded questions, the `20260717120000` placeholder topic groups) are now invisible to everyone.

**Filtering happens in RLS, not in app code.** `lib/supabase/server.ts`'s `createClient()` is cookie-scoped (anon key, caller's session), so queries carry no `.eq('created_by', ...)` — the DB enforces it for the browser client and server actions too. Adding an app-level filter duplicates the rule at one call site while the actual boundary stays the policy; what _does_ break the model is reaching for the service-role client on a read path.

`scripts/backfill-static-sections.js <email>` is the one-time fixup: the static curriculum's subtopics never had `sections` rows, so they became unreachable under owner-scoped reads until real rows exist owned by a real account. Not yet run against cloud.

`scripts/pull-remote.js` (`npm run pull-remote`) seeds **local** Docker Supabase from the cloud project: it copies content + the source account's study data and rewrites every `created_by`/`user_id` to `DEV_USER`, so local dev sees a real dataset. It derives `sections` rows from the imported questions (broader than `backfill-static-sections.js`, which only knows the static list) and folds the cloud's still-separate `starred_questions`/`priority` tables into `questions.starred`/`questions.priority` — cloud is behind `20260804105557_merge_starred_priority_into_questions`. Upsert-only and safe to re-run; it never writes to the remote.

### Dynamic topics & authoring

- `lib/topics.ts` holds the static `TOPIC_GROUPS` curriculum plus shared types (`TopicGroup`/`SectionMeta`) and pure helpers (`findGroup`, `sectionUrl`, `slugify`, etc.), which take a `groups` array as an explicit parameter. **`TOPIC_GROUPS` is no longer read at runtime** — its only consumer is `scripts/backfill-static-sections.js`, which uses it as seed data.
- New tables `topic_groups` and `sections` (migrations `20260715120000_topic_groups.sql`, `20260716120000_topic_delete.sql`) let signed-in non-anonymous users add topics/subtopics at runtime.
- `lib/topicsData.ts`'s `getAllGroups()` (request-memoized via React `cache()`, server-only) returns **only the caller's own** `topic_groups` + `sections` rows — no merge with `TOPIC_GROUPS`, so it's an empty array for a brand-new account. Every reader of the curriculum (routing, sidebar, dashboard, Add Question pickers) goes through this.
- `lib/actions/topics.ts` — `addTopicGroup`/`addSection`/`deleteSection`/`deleteTopicGroup` server actions; deletes refuse if any questions are still filed under the topic/subtopic.
- **AI-assisted authoring** (`lib/actions/generateQuestion.ts`, `generateAnswer.ts`, `generateBlurb.ts`, `generateProblem.ts`, `suggestPlacement.ts`, `checkDuplicate.ts`, `formatAnswer.ts`) all call Google Gemini's REST API directly (no SDK) using `FREE_GEM_API_KEY`, gated behind sign-in + non-anonymous. `lib/aiModels.ts` exports the shared model list (`gemini-3.1-flash-lite` default, `gemini-3-flash-preview`). Each action is an independent `'use server'` function that re-derives auth itself — there's no shared AI-client wrapper. `suggestPlacement` and `checkDuplicate` re-validate the model's JSON response against the real curriculum/question list server-side since the model can hallucinate ids.
- `components/AddQuestionFab.tsx` (draggable via `lib/useFabDrag.ts`) opens `AddTopicModal` or the large `AddQuestionModal.tsx` (markdown preview via `marked` + `isomorphic-dompurify`, wires up all AI actions, keeps an in-memory-only `AnswerVersion[]` history of generated drafts — this is the "answer versioning" from commit `fca05e1`; it's a UI convenience, not a DB-level version table).

### Question moves & id-based progress tracking

Question ids are namespaced by section (`"{topic}/{file}/u-{uuid}"`), and progress/priority/starred all key off that id. Whenever a question's section changes (`updateQuestion`, or `moveQuestion` via `MoveQuestionModal.tsx`), the action **mints a new id** rather than repointing `topic`/`file` on the old one — otherwise the question would count toward its old subtopic forever. `carryOverProgress()` in `lib/actions/questions.ts` migrates the _current user's own_ `progress`/`priority`/`starred_questions` rows to the new id (insert-before-delete for row-presence tables like `progress`, single `UPDATE` for tables with an own-row update policy). This is scoped to the acting user only — other users' rows on a shared question aren't migrated. The Zustand store mirrors this locally via `renameProgressId`/`renamePriorityId`/`renameStarId`/`renameOrderId` so the UI doesn't wait on a reload.

`20260711190453_question_edit_delete.sql` added `questions.markdown` (raw source, so edits reload real Markdown) plus owner-scoped update/delete RLS (`created_by IS NULL` on ETL rows makes them uneditable except by admins). `20260715180000_question_impl_fields.sql` added `lang`/`tags`/`problem` — a non-empty `problem` is what switches `QuestionItem` to a "Problem → Solution" layout (no separate boolean).

### Study-flow features (each: server action + db helper + Zustand slice)

- **Inbox** (`lib/actions/inbox.ts`, `lib/db/inbox.ts`, `components/InboxCaptureModal.tsx`/`InboxClient.tsx`/`InboxFab.tsx`, `app/inbox/page.tsx`, table `inbox_items`) — zero-friction capture of pasted text before picking a topic. Allowed for anonymous users (private scratch notes). `lib/actions/splitInboxText.ts` uses Gemini to split freeform pasted text (e.g. a recruiter message) into distinct question strings — this path _is_ gated behind sign-in. Assigning an inbox item reopens `AddQuestionModal` prefilled with it; saving deletes the source item.
- **Set aside** (`lib/actions/setAside.ts`, `lib/db/setAside.ts`, table `set_aside_items`) — kebab menu's soft-delete: `setAsideQuestion()` inserts a full content snapshot into `set_aside_items` _before_ deleting from `questions` (insert-then-delete, so a mid-failure can never lose content), and best-effort cleans the user's own progress/priority/starred rows. Reassigning (from `InboxClient`'s "Set aside" tab) reopens `AddQuestionModal` prefilled with the full saved answer, unlike inbox items which only have a title.
- **Starred** (`lib/actions/starred.ts`, `lib/db/starred.ts`, `components/StarredClient.tsx`, `app/starred/page.tsx`, table `starred_questions`) — row-presence toggle, optimistic local update, no offline queue (hand-curation, not something toggled mid offline-study-session).
- **Priority / Priority Mix** (`lib/actions/priority.ts`, `lib/db/priority.ts`, `components/PriorityMixClient.tsx`, `app/priority-mix/page.tsx`, table `priority` with `level` high/med/low) — `user_settings.default_priority` (migration `20260718130000_default_priority.sql`) sets what's pre-selected on new questions.
- **Manual question reordering** (`lib/actions/questionPosition.ts`, table `question_position`, drag logic in `components/SectionClient.tsx`) — native Pointer Events, no drag library; a floating clone tracks the pointer and drop slot is computed from the pointer's Y vs. each row's midpoint. Only enabled in `'manual'` sort mode with no active filters. **Touch pointers are explicitly bailed out of** (`if (e.pointerType !== 'mouse') return`) so drag-to-reorder doesn't fight with scroll gestures — reordering is effectively mouse-only.
- Of all of these, only **progress** and **priority** get full offline pending-ops treatment (see below) — starring, reordering, and inbox/set-aside are deliberately online-only.

### Offline support / PWA

- `public/sw.js` is a **hand-written service worker**, not generated by Serwist — `@serwist/next`/`serwist` are in `package.json` but `next.config.js` does not wrap the config with `withSerwist`. Treat Serwist as an installed-but-currently-unwired dependency, not the actual build mechanism.
- `components/ServiceWorkerRegistration.tsx` registers `/sw.js` only in production; in dev it actively unregisters any existing SW so stale caches can't mask local changes.
- `lib/offlineSync.ts` is a localStorage-backed layer: cached progress/priority/question content per section/totals, plus two pending-ops queues (progress toggles, priority sets) replayed through the normal bulk server actions once back online. `offlineSlice.enableOfflineMode()` snapshots current state, fetches+caches every section's questions via the browser Supabase client, and caches full page responses into Cache Storage (`caches.open(...)`) so navigation works offline; `disableOfflineMode()` flushes pending ops (if online) then clears everything.
- `OfflineStatusPill.tsx`/`OfflineToast.tsx` are the UI surfaces (online/offline indicator, cached-at timestamp, pending-ops count, manual sync).

### Instruction presets

`lib/instructionPresets.ts` — user-editable style instructions fed into the AI generation actions, auto-selected by `kind` (`text` vs `code`) rather than one global "active" choice. Four protected built-ins (`default-text`/`default-code`/`default-suggestion`/`default-problem`) always exist and can't be deleted; `migratePresets()` backfills any missing from older saved data. Moved from `localStorage`-only to `user_settings.instruction_presets` (jsonb) + `active_instruction_preset_id` (migration `20260716220000_instruction_presets.sql`) so presets sync across devices; `settingsSlice.loadSettings` still falls back to localStorage for brand-new accounts with no `user_settings` row yet. Managed from `/settings` (`components/SettingsClient.tsx`).

### Misc

- **React Imports**: The codebase uses the automatic JSX runtime (`"jsx": "react-jsx"` in `tsconfig.json`). Do **NOT** import `React` (e.g., `import React from 'react'`) in `.tsx` files unless explicitly using `React` functions or types directly. Import hooks (like `useState`, `useEffect`, etc.) directly from `'react'`.
- **Syntax highlighting** — `lib/highlight.ts` wraps Prism.js, highlighting the `<pre><code class="language-xxx">` DOM that `marked` already produces (no re-render needed).
- **HTML→Markdown fallback** — `lib/htmlToMarkdown.ts` (via `turndown`) best-effort reconstructs Markdown for editing ETL-imported questions that predate the `markdown` column; explicitly lossy.
- **FAB drag** — `lib/useFabDrag.ts` uses its own small Zustand store (`useFabOffsetStore`, separate from `useAppStore` — pure client UI concern, and the FABs render outside `UIProvider` in `layout.tsx`) so dragging any one FAB moves the whole bottom-right cluster together; resets on route change.
- **Exports**: Always use named exports (e.g., `export const MyComponent = ...`) instead of default exports (`export default ...`), unless it is absolutely necessary (such as for Next.js routing page files, dynamic lazy loading using `next/dynamic` where it expects a default export, or configuration files).
- **Naming**: A name must say what the thing is for, without being a sentence. Aim for the shortest name that still answers "what is this?" on its own — `canCheckDuplicate`, `resolveTargetSection`, `pendingPlacement`. Avoid names that need the surrounding line to make sense (`data`, `handle`, `tmp`, `flag`, `p2`), and equally avoid padding that adds no information (`questionGeneratorLoadingStateValue`, `theCurrentlySelectedTopicGroupSlug`). Drop words the context already supplies: inside `usePlacement`, `pending` beats `pendingPlacement`; inside `QuestionField`, `value` beats `questionFieldValue`. Booleans read as assertions (`isImpl`, `canSave`, `hasResult`), functions as verbs (`suggest`, `acceptSuggestion`, `reset`).
- **Arrow bodies**: If an arrow function's body doesn't fit on the same line as the `=>`, give it a block body with an explicit `return` — never leave a concise body dangling on the next line. Exempt: bodies wrapped in parentheses, i.e. `=> (` for JSX and `=> ({` for an object literal; those stay as they are. Applies to new code; don't retrofit existing files.
  ```ts
  // no — body wrapped to the next line                // yes
  const labelOf = (options, v) =>                      const labelOf = (options, v) => {
    options.find((o) => o.value === v)?.label ?? '';     return options.find((o) => o.value === v)?.label ?? '';
                                                       };
  // fine as-is — parenthesised body
  {items.map((i) => (<Row key={i.id} {...i} />))}
  const toOption = (g) => ({ value: g.slug, label: g.groupName });
  ```
- **State Locality and Store Access**: When creating or refactoring components, always try to keep state as local to the component as possible. Lift state up only when it is absolutely necessary. Do not pass store data down as props if it can be accessed directly within the component from the Zustand store. Always try to separate concerns, break down complex components, and keep state localized.
- **`components/MainContent.tsx`** — swaps in `<SearchResults>` when the shared search query is ≥ 2 chars, and manually resets scroll on pathname change (the whole app is one catch-all route, so Next's built-in scroll reset never fires).

### Components

See `components/AGENTS.md` for UI primitives and component conventions (feature-first organization, when to split a file, root-level `components/` independence rules).
