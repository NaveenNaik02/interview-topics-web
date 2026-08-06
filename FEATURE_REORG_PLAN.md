# Feature-first folder restructure

## Context

The codebase (`web/`) is currently organized file-type-first: `components/*.tsx` flat, `lib/actions/*.ts` flat, `lib/db/*.ts` flat, `lib/stores/slices/*.ts` flat. The project's own `CLAUDE.md` already documents feature-first as the intended shape for *new* code — `components/AddQuestionModal/` (an orchestrator `index.tsx` plus colocated `MarkdownField.tsx`, `InstructionsModal.tsx`, `useAiActions.ts`, `useAnswerVersions.ts`, `types.ts`, `markdownPreview.ts`) is called out as the reference shape. The goal now is to bring the *existing* ~90 files in line with that convention: group each study-flow feature's components/actions/db/store together, and leave only genuinely shared/cross-cutting code (contexts, ui primitives, app shell, Supabase clients, core domain types) in `components/`/`lib/`.

An Explore pass mapped every import relationship across `components/`, `lib/actions/`, `lib/db/`, and `lib/stores/slices/` to find real feature boundaries and the coupling points that don't fit neatly (confirmed via grep, not guessed): `lib/ProgressContext.tsx` is a 16-consumer facade over 9 slices, `lib/topics.ts` is a 21-importer core domain-types module, `PriorityLevel` is defined in the Offline feature's file but is really Priority's enum, `SortMode` is defined inside a component (`FilterSortToolbar.tsx`) but consumed by the settings DB/store layer, and `QuestionItem.tsx`/`RowActions.tsx` are shared across three different feature clients (Section view, Starred, Priority Mix). The plan below is designed around that real dependency graph, not a generic template — each hard-coupling case has an explicit resolution rather than being papered over.

`ResetButton.tsx` was confirmed dead (zero importers anywhere) during verification — it will be deleted in its own small first commit, before the reorg, so dead code doesn't get dragged through ~90 file moves.

Execution will proceed one feature at a time: move files, repoint imports (movers + all consumers), run `npm run lint && npm test && npm run build`, then continue to the next feature. Each feature is its own commit.

## Target shape

```
features/<name>/
  index.ts                  # Root barrel export file (export public components, actions, db queries)
  BaseClient.tsx            # The main page/client component at the root of the feature
  components/               # Feature-private sub-components (topic card, list items, forms, etc.)
  actions.ts | actions/     # 'use server' functions — flat file if 1, dir if 3+
  db/                       # supabase query layer and database helper files
  store/                    # zustand slice(s) + feature-local selectors
  types.ts                  # only if the feature has a domain type worth naming
```

Every feature folder MUST have a root `index.ts` file that acts as a barrel export, re-exporting only the feature's public API. External consumers must import from the feature root path (`@/features/<name>`) rather than deep file paths. Single-file layers stay flat (no `actions/index.ts` for one file). `features/` sits as a peer to `components/` (shared UI shell + `ui/` primitives only) and `lib/` (true cross-cutting infra only) — it does not replace either, because real shared/composition code exists and forcing it into a feature folder would just relocate the coupling.

```
app/                                  # unchanged paths — imports repointed only
components/                           # shared UI shell + primitives ONLY
  ui/                                 # accordion, badge, button, card, progress
  Sidebar.tsx, Topbar.tsx, MainContent.tsx
  ConfirmDialog.tsx, SaveToast.tsx, AqSelect.tsx, ThemeSync.tsx, StoreBootstrap.tsx
  QuestionItem.tsx, RowActions.tsx     # shared list-item, see "Hard coupling" below

features/
  auth/            devUser.ts, store/authSlice.ts
  set-aside/       actions.ts, db.ts, store/setAsideSlice.ts
  question-order/  actions.ts, db.ts, store/questionOrderSlice.ts
  inbox/           components/{InboxClient,InboxCaptureModal,InboxFab}.tsx,
                   actions/{inbox,splitInboxText}.ts, db.ts, store/inboxSlice.ts
  starred/         components/StarredClient.tsx, actions.ts, db.ts, store/starredSlice.ts
  priority/        components/PriorityMixClient.tsx, actions.ts, db.ts,
                   store/prioritySlice.ts, types.ts (PriorityLevel)
  progress/        actions.ts, db.ts, store/{progressSlice,progressSelectors}.ts, context.tsx (from TotalsContext)
  settings/        components/SettingsClient.tsx, actions.ts, db.ts,
                   store/settingsSlice.ts, instructionPresets.ts(+.test.ts), types.ts (SortMode)
  offline/         components/{OfflineStatusPill,OfflineToast,ServiceWorkerRegistration}.tsx,
                   sync.ts (from offlineSync.ts), store/offlineSlice.ts, swConstants.ts
  authoring/       components/{AddQuestionFab,AddQuestionModal/*,MoveQuestionModal}.tsx,
                   actions/{questions,checkDuplicate,formatAnswer,generateAnswer,generateProblem,generateQuestion,suggestPlacement}.ts
  topics/          components/AddTopicModal.tsx, actions/{topics,generateBlurb}.ts,
                   data.ts (from topicsData.ts), context.tsx (from TopicsContext.tsx)
  section-view/    components/{SectionClient,SectionSkeleton,FilterSortToolbar}.tsx
  search/          components/SearchResults.tsx
  dashboard/       components/DashboardClient.tsx

lib/                                  # cross-cutting infra only — unmoved
  ProgressContext.tsx, ThemeContext.tsx, FontSizeContext.tsx, UIContext.tsx
  topics.ts, parser.ts, highlight.ts, htmlToMarkdown.ts, aiModels.ts
  useFabDrag.ts, useTypewriter.ts, utils.ts
  stores/{appStore.ts,types.ts}       # composition root, imports every feature's store/
  supabase/{client,server,public,middleware}.ts
```

`app/**/page.tsx|layout.tsx|loading.tsx` never move (Next.js file-based routing) — only their import lines change.

## Hard-coupling resolutions

- **`lib/ProgressContext.tsx`** (16 consumers spanning 9 slices) — stays in `lib/`, unmoved. It's already documented as a deliberate compatibility shim; splitting it into per-feature hooks is a state-architecture change, not a file-location change, and out of scope here.
- **`lib/topics.ts`** (21 importers: `TopicGroup`, `SectionMeta`, `sectionUrl`, `slugify`, etc.) — stays in `lib/`, unmoved, despite the name coinciding with the `topics` feature. Only `lib/actions/topics.ts`, `lib/topicsData.ts`, and `AddTopicModal.tsx` move into `features/topics/`. Do not drag `lib/topics.ts` itself in during execution.
- **`PriorityLevel`** — currently defined in `lib/offlineSync.ts`, consumed by ~10 files across Priority/Offline/Settings/Section-view/Authoring. Relocate to `features/priority/types.ts` (it's Priority's domain enum by meaning). `features/offline/sync.ts` and `features/settings/db.ts`/`store/settingsSlice.ts` then import it from there — a one-way, directionally-correct cross-feature type import.
- **`SortMode`** — currently defined inside `components/FilterSortToolbar.tsx` (a component), imported by `lib/db/settings.ts` and `settingsSlice.ts`. Extract to `features/settings/types.ts`; `features/section-view/components/FilterSortToolbar.tsx` imports it from there instead. Fixes a `lib/db` → `component` inversion.
- **`Theme`** (from `lib/ThemeContext.tsx`) — no change needed. `ThemeContext` is legitimate shared infra; `features/settings/db.ts`/`store/settingsSlice.ts` keep importing `Theme` from `lib/ThemeContext.tsx` as-is.
- **`QuestionItem.tsx` / `RowActions.tsx`** — stay in shared `components/`, not owned by section-view/starred/priority even though those are its only consumers. Picking one "owner" would make the other two features import a component from an unrelated feature folder, which is worse than today. Not duplicated three ways either — one component, props-driven.
- **`offlineSync.ts`'s direct imports of `lib/actions/progress.ts` and `lib/actions/priority.ts`** (for pending-op replay on reconnect) — inherent to what it does, not accidental coupling. After the move, `features/offline/sync.ts` imports `features/progress/actions.ts` and `features/priority/actions.ts` directly; no event-bus indirection for two call sites.
- **`lib/actions/questions.ts`** (authoring) importing `lib/topicsData.ts`/`lib/topics.ts` — becomes `features/authoring/actions/questions.ts` importing `features/topics/data.ts` (moved) and `lib/topics.ts` (stays put). Expected cross-feature dependency, not a smell.

## Migration order

Ordered by ascending fan-in so each step's import-path blast radius stays small and the app stays buildable/testable throughout. Each step = its own commit, gated by `npm run lint && npm test && npm run build`.

1. **Delete `components/ResetButton.tsx`** (dead code, confirmed zero importers) — standalone first commit.
2. **`features/auth/`** — 2 files, no components, lowest fan-in.
3. **`features/set-aside/`** and **`features/question-order/`** — no dedicated page, clean triples, only consumers are the not-yet-moved Starred/PriorityMix/SectionClient (their import lines get touched again when those features move later).
4. **`features/inbox/`** — self-contained triple + its own page.
5. **`features/starred/`**, then **`features/priority/`** (separately, not combined) — pulls in already-moved `set-aside`; Priority's step also relocates `PriorityLevel` to `features/priority/types.ts`.
6. **`features/progress/`** and **`features/settings/`** — settings' step includes the `SortMode` extraction into `features/settings/types.ts` (touches `FilterSortToolbar.tsx`'s import, not its move).
7. **`features/offline/`** — after Priority and Progress, since it imports both of their actions and needs `PriorityLevel` already relocated.
8. **`features/authoring/`**, then **`features/topics/`** — authoring first (more existing features already depend on `AddQuestionModal`/`MoveQuestionModal`, so moving it first means one clean follow-up repoint in Starred/PriorityMix rather than two). Confirm `generateBlurb.ts` goes to `topics/` (only `AddTopicModal` uses it) not `authoring/`, despite the naming pattern with the other `generate*` actions.
9. **`features/section-view/`** — most heavily coupled client component (touches authoring, set-aside, offline, settings, shared `ConfirmDialog`/`SaveToast`); do last among the "real" features so its import list is only edited once.
10. **`features/search/`** and **`features/dashboard/`** — trivial single-file moves, any order, no dependents of their own.
11. **Final sweep** — confirm `lib/stores/appStore.ts`/`lib/stores/types.ts` import all 9 slices from their final `features/*/store/*` paths; full `npm run lint && npm test && npm run build` as the closing gate.

## Verification

After each step: `npm run lint`, `npm test`, `npm run build` from `web/`. After the full migration: start `npm run dev`, exercise each route that moved (`/`, `/inbox`, `/starred`, `/priority-mix`, `/settings`, a topic section page) to confirm no runtime import errors, then spot-check one full user flow (add a question via the FAB, star it, set it aside) since that path crosses the most feature boundaries (authoring → section-view/starred → set-aside → progress).
