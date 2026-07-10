# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build (queries Supabase at build time)
npm run start    # Serve production build
```

ETL lives in the sibling `content/` repo — run from there:
```bash
cd ../content
npm run etl      # Parse all .md files and upsert questions into Supabase
                 # Re-run whenever markdown content changes
```

Requires `.env.local` in `web/` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

There are no tests or linting scripts configured.

Database schema changes: see "Database Migrations" in the root `CLAUDE.md` — add a `.sql` file to `../supabase/migrations/`, then `npm run migrate` from here to apply it.

## Architecture

This is a **Next.js 14 App Router** application backed by **Supabase** (Postgres). Content and progress are both stored in the database — there is no runtime dependency on the local Markdown files.

**Content loading** — `lib/parser.ts` is `server-only` and queries Supabase. `countQuestions` and `parseSection` both hit the `questions` table, which is populated by `scripts/etl.js`. HTML is pre-rendered during ETL (not at query time).

**ETL** — `scripts/etl.js` reads the Markdown files, splits on `## \d+\. ` headings, renders HTML via `remark`, and upserts rows into the `questions` table using the service role key. The `SECTIONS` array in that file mirrors `TOPIC_GROUPS` in `lib/topics.ts` — keep both in sync when adding sections.

**Routing** — a single catch-all route `app/[...path]/page.tsx` handles two shapes:
- `/{slug}` — topic overview listing all sections (single-section groups auto-redirect to their section)
- `/{topic}/{file}` — section view showing all questions (e.g. `/react/ecosystem/redux`)

Static paths are pre-generated via `generateStaticParams` from `TOPIC_GROUPS`.

**Topic registry** — `lib/topics.ts` is the single source of truth for slugs/topics/files/labels. Adding a new section requires entries in both `TOPIC_GROUPS` (here) and the `SECTIONS` array in `scripts/etl.js`.

**Progress tracking** — `lib/ProgressContext.tsx` uses **Supabase anonymous auth** + the `progress` table. On first mount, `signInAnonymously()` creates a persistent session (stored by the Supabase client in `localStorage`). Progress is loaded into React state and all toggle/reset operations write through to the database. The `mounted` flag is set only after the session and progress are loaded — always check it before rendering progress values.

**Server/client split** — pages are async server components that call `parseSection`/`countQuestions` and pass `ParsedQuestion[]` down to client components (`SectionClient`, `DashboardClient`) which own all interactive state.

**UI primitives** — `components/ui/` contains shadcn/ui-style components (Accordion, Badge, Card, Progress, Button). Tailwind + `@tailwindcss/typography` for styling.
