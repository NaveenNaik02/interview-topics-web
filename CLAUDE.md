# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```

Database schema changes: see "Database Migrations" in the root `CLAUDE.md` — add a `.sql` file to `supabase/migrations/`, then `npm run migrate` from here to apply it to the linked **cloud** project (local dev picks up the same files automatically via `supabase start`).

## CI/CD

`.github/workflows/ci.yml` runs `lint` and `test` as separate jobs on every push to `main`.

`.github/workflows/deploy.yml` is manual only (`workflow_dispatch`, run from the Actions tab) — it never fires on push. It runs `node scripts/migrate.js` (applying any pending `supabase/migrations/*.sql` to the linked project) before building and deploying to Vercel production, so the new build never runs against a schema it doesn't expect. Needs the `SUPABASE_ACCESS_TOKEN` and `NEXT_PUBLIC_SUPABASE_URL` repo secrets in addition to the existing Vercel ones.

## Architecture

This is a **Next.js 16 App Router** application (React 19) backed by **Supabase** (Postgres). Content, progress, and now a growing set of user-authored/curated data (topics, inbox, starred, set-aside, priority, question order, settings) all live in the database — there is no runtime dependency on local Markdown files except during ETL.

### Content loading & routing

- `lib/parser.ts` (`server-only`) queries Supabase. `countQuestions`/`parseSection` hit the `questions` table, populated by `scripts/etl.js` (which renders HTML via `remark` at ETL time, not query time) plus any questions authored directly in the app (HTML rendered via `marked` + `isomorphic-dompurify` at write time instead — see below).
- Catch-all route `app/[...path]/page.tsx` still handles `/{slug}` (topic overview, auto-redirects single-section groups) and `/{topic}/{file}` (section view), but now resolves the curriculum through `getAllGroups()` (see "Dynamic topics") instead of the static `TOPIC_GROUPS` directly, so user-added topics/subtopics are routable.
- `generateStaticParams()` calls `getAllGroups()` at build time and emits paths for everything that exists then. `dynamicParams` is left at its Next default (`true`) and `export const revalidate = 3600`, so this is effectively **ISR**: build-time static generation for the known curriculum, on-demand generation + hourly revalidation for anything added afterward. Server actions that mutate content (`lib/actions/questions.ts`, `topics.ts`, `setAside.ts`) explicitly `revalidatePath` both the section and its topic overview so writes don't wait out the hour.
- Four extra top-level routes sit alongside the catch-all, each a small server component: `app/inbox/page.tsx` and `app/settings/page.tsx` do no server fetch (their data lives client-side in the Zustand store); `app/priority-mix/page.tsx` and `app/starred/page.tsx` fetch the user's rows + a `questions` join server-side before handing assembled data to their client component.

### State management: Zustand store + Context (different jobs, not layers)

State that used to live in `ProgressProvider`'s component body now lives in a single Zustand store, `useAppStore` (`lib/stores/appStore.ts`), composed from 9 slices (`lib/stores/slices/*.ts`: auth, progress, priority, settings, inbox, setAside, starred, offline, questionOrder — types in `lib/stores/types.ts`).

- **`lib/ProgressContext.tsx` is now a thin compatibility shim, not a real provider** — it's a hook that reads the Zustand store via `useShallow` selectors and reshapes it into the same object every existing consumer already destructures, so call sites didn't need to change. It also merges in `groups`/`initialTotals` from the separate `TopicsContext`/`TotalsContext` to compute `stats` synchronously on first render.
- **`components/StoreBootstrap.tsx`** (render-null client component) replaces the old always-mounted provider: fires one-time bootstrap effects (`setInitialTotals`, mirroring `useTopicGroups()` into the store, `initSettingsFromLocalStorage`, `initOfflineState`, `initAuth`).
- **Context and Zustand coexist for genuinely different concerns**:
  - `TopicsContext`/`TotalsContext` remain plain Context — they tunnel **server-computed, request-scoped** values (`getAllGroups()`, `fetchAllCounts()`, both computed once in `app/layout.tsx`) down the tree synchronously.
  - `UIContext` (drawer/search), `ThemeContext`, `FontSizeContext` remain plain, self-contained Context+`useState` — pure client-only UI state with no server dependency.
  - Anything needing to be read outside React rendering (server-action side effects, offline caching reading `groups`/totals via `get()`) or shared across components without a common provider lives in the Zustand store.

### Auth & admin roles

- Regular users get Supabase **anonymous auth** as before. In **dev**, `lib/devUser.ts` provides a fixed seeded account (`dev@local.test`) that `authSlice.initAuth()` signs into instead (`signInWithPassword`, falling back to `signUp` — safe because the local stack has email confirmation disabled). This means dev always has a real, non-anonymous account, so every authoring action can use one universal rule — "must be signed in and not anonymous" — with zero per-environment branching inside the actions themselves.
- **Admin status** is stored in `app_metadata.is_admin` (never `user_metadata` — `app_metadata` can only be set by the service role, so it's safe to trust inside RLS policies). Granted via `npm run set-admin <email>` (`scripts/set-admin.js`). Migrations `20260711194952_admin_question_access.sql` / `20260716120000_topic_delete.sql` add permissive `_admin` RLS policies (Postgres ORs multiple permissive policies) letting admins edit/delete any question or topic, including ETL-seeded rows (`created_by IS NULL`, untouchable by regular users). Client-side, `user.app_metadata?.is_admin === true` gates the same actions alongside `createdBy === user.id` ownership checks (`SectionClient`, `StarredClient`, `PriorityMixClient`).
- Authoring server actions (add/edit/delete question, add topic/section, AI generation) are gated behind **signed-in AND not anonymous** via a shared `requireAuthor()`-style check — anonymous users can still track progress/priority/starred/inbox, just not create shared content.

### Dynamic topics & authoring

- `lib/topics.ts` still holds the static `TOPIC_GROUPS` curriculum plus shared types (`TopicGroup`/`SectionMeta`) and pure helpers (`findGroup`, `sectionUrl`, `slugify`, etc.), now rewritten to take a `groups` array as an explicit parameter instead of closing over `TOPIC_GROUPS`.
- New tables `topic_groups` and `sections` (migrations `20260715120000_topic_groups.sql`, `20260716120000_topic_delete.sql`) let signed-in non-anonymous users add topics/subtopics at runtime. `20260717120000_seed_static_topic_groups.sql` backfilled placeholder (`created_by = NULL`, admin-only-deletable) rows for every static slug so `sections` inserts under an *existing* static topic don't violate the FK.
- `lib/topicsData.ts`'s `getAllGroups()` (request-memoized via React `cache()`, server-only) merges the DB rows onto a clone of `TOPIC_GROUPS` — every reader of the curriculum (routing, sidebar, dashboard, Add Question pickers) is expected to go through this, not `TOPIC_GROUPS` directly.
- `lib/actions/topics.ts` — `addTopicGroup`/`addSection`/`deleteSection`/`deleteTopicGroup` server actions; deletes refuse if any questions are still filed under the topic/subtopic.
- **AI-assisted authoring** (`lib/actions/generateQuestion.ts`, `generateAnswer.ts`, `generateBlurb.ts`, `generateProblem.ts`, `suggestPlacement.ts`, `checkDuplicate.ts`, `formatAnswer.ts`) all call Google Gemini's REST API directly (no SDK) using `FREE_GEM_API_KEY`, gated behind sign-in + non-anonymous. `lib/aiModels.ts` exports the shared model list (`gemini-3.1-flash-lite` default, `gemini-3-flash-preview`). Each action is an independent `'use server'` function that re-derives auth itself — there's no shared AI-client wrapper. `suggestPlacement` and `checkDuplicate` re-validate the model's JSON response against the real curriculum/question list server-side since the model can hallucinate ids.
- `components/AddQuestionFab.tsx` (draggable via `lib/useFabDrag.ts`) opens `AddTopicModal` or the large `AddQuestionModal.tsx` (markdown preview via `marked` + `isomorphic-dompurify`, wires up all AI actions, keeps an in-memory-only `AnswerVersion[]` history of generated drafts — this is the "answer versioning" from commit `fca05e1`; it's a UI convenience, not a DB-level version table).

### Question moves & id-based progress tracking

Question ids are namespaced by section (`"{topic}/{file}/u-{uuid}"`), and progress/priority/starred all key off that id. Whenever a question's section changes (`updateQuestion`, or `moveQuestion` via `MoveQuestionModal.tsx`), the action **mints a new id** rather than repointing `topic`/`file` on the old one — otherwise the question would count toward its old subtopic forever. `carryOverProgress()` in `lib/actions/questions.ts` migrates the *current user's own* `progress`/`priority`/`starred_questions` rows to the new id (insert-before-delete for row-presence tables like `progress`, single `UPDATE` for tables with an own-row update policy). This is scoped to the acting user only — other users' rows on a shared question aren't migrated. The Zustand store mirrors this locally via `renameProgressId`/`renamePriorityId`/`renameStarId`/`renameOrderId` so the UI doesn't wait on a reload.

`20260711190453_question_edit_delete.sql` added `questions.markdown` (raw source, so edits reload real Markdown) plus owner-scoped update/delete RLS (`created_by IS NULL` on ETL rows makes them uneditable except by admins). `20260715180000_question_impl_fields.sql` added `lang`/`tags`/`problem` — a non-empty `problem` is what switches `QuestionItem` to a "Problem → Solution" layout (no separate boolean).

### Study-flow features (each: server action + db helper + Zustand slice)

- **Inbox** (`lib/actions/inbox.ts`, `lib/db/inbox.ts`, `components/InboxCaptureModal.tsx`/`InboxClient.tsx`/`InboxFab.tsx`, `app/inbox/page.tsx`, table `inbox_items`) — zero-friction capture of pasted text before picking a topic. Allowed for anonymous users (private scratch notes). `lib/actions/splitInboxText.ts` uses Gemini to split freeform pasted text (e.g. a recruiter message) into distinct question strings — this path *is* gated behind sign-in. Assigning an inbox item reopens `AddQuestionModal` prefilled with it; saving deletes the source item.
- **Set aside** (`lib/actions/setAside.ts`, `lib/db/setAside.ts`, table `set_aside_items`) — kebab menu's soft-delete: `setAsideQuestion()` inserts a full content snapshot into `set_aside_items` *before* deleting from `questions` (insert-then-delete, so a mid-failure can never lose content), and best-effort cleans the user's own progress/priority/starred rows. Reassigning (from `InboxClient`'s "Set aside" tab) reopens `AddQuestionModal` prefilled with the full saved answer, unlike inbox items which only have a title.
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

- **Syntax highlighting** — `lib/highlight.ts` wraps Prism.js, highlighting the `<pre><code class="language-xxx">` DOM that `marked` already produces (no re-render needed).
- **HTML→Markdown fallback** — `lib/htmlToMarkdown.ts` (via `turndown`) best-effort reconstructs Markdown for editing ETL-imported questions that predate the `markdown` column; explicitly lossy.
- **FAB drag** — `lib/useFabDrag.ts` uses its own small Zustand store (`useFabOffsetStore`, separate from `useAppStore` — pure client UI concern, and the FABs render outside `UIProvider` in `layout.tsx`) so dragging any one FAB moves the whole bottom-right cluster together; resets on route change.
- **`components/MainContent.tsx`** — swaps in `<SearchResults>` when the shared search query is ≥ 2 chars, and manually resets scroll on pathname change (the whole app is one catch-all route, so Next's built-in scroll reset never fires).

### UI primitives

`components/ui/` contains shadcn/ui-style components (Accordion, Badge, Card, Progress, Button). Tailwind + `@tailwindcss/typography` for styling.

### Component conventions

**New code is organized feature-first, not file-type-first.** When building a new feature (a modal, a study-flow feature, a new authoring surface), start with a folder named for the feature under `components/` (or `lib/actions/` for its server actions) and put that feature's pieces inside it — don't default to dropping flat files alongside unrelated components just because that's `components/`'s existing shape. Within the feature folder, still split into standalone components/hooks per the rules below rather than one large file — the folder is the feature boundary, the files inside it are the actual units of reuse/testability. This is proactive (decide the shape up front for anything non-trivial), unlike the "when a component grows" trigger below, which is reactive cleanup for code that wasn't planned this way. See `components/AddQuestionModal/` (`index.tsx` orchestrator + `MarkdownField.tsx`, `InstructionsModal.tsx`, `useAnswerVersions.ts`, `useAiActions.ts`, `types.ts`, `markdownPreview.ts`) as the reference shape.

`eslint.config.mjs` warns (doesn't fail CI) when a file under `components/**` or `lib/actions/**` exceeds 200 lines (`max-lines`) — a tripwire to catch drift, not the actual rule. Line count alone never decides whether to split a component; splitting only to hit a number produces meaningless bins (`Header.tsx`/`Body.tsx`/`Footer.tsx`) that just relocate the same coupling. Split when one of these is actually true:

- **Mixed concerns** — data-fetching/business logic tangled with rendering. Extract the logic into a custom hook (`lib/use*.ts`, following `useFabDrag`/`useTypewriter`/`useProgress`), leave the component rendering only.
- **A genuinely separable, reusable, or independently-testable subtree** — e.g. a modal's markdown editor or AI-actions toolbar deserves its own file; a component's header/body/footer usually doesn't.
- **Repeated markup or logic** (3+ similar blocks) — extract a shared component or map over data instead.
- **A conditionally-rendered heavy subtree** (modal body, rarely-used panel) — extract it **and** lazy-load it (`next/dynamic` or `import()`, per the FAB modals and `lib/highlight.ts`) so it's a bundle-size win, not just a readability one.

When a component does grow siblings, colocate them in a folder (`components/AddQuestionModal/index.tsx`, `MarkdownEditor.tsx`, `AiToolbar.tsx`) instead of scattering flat files across `components/`.
