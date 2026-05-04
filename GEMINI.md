# GEMINI.md

This project is an interview topics web application built with **Next.js 16** and **Supabase**.

## Project Overview

- **Purpose:** A centralized platform for studying technical interview topics with progress tracking.
- **Tech Stack:** 
  - **Framework:** Next.js 16 (App Router)
  - **Core Libraries:** React 19, Radix UI
  - **Language:** TypeScript
  - **Styling:** Tailwind CSS + @tailwindcss/typography
  - **Database:** Supabase (Postgres)
  - **UI Components:** Radix UI primitives, Lucide Icons, Shadcn-style components.

## Architecture

- **Routing:** Dynamic catch-all routing in `app/[...path]/page.tsx` handles both topic overviews (e.g., `/javascript`) and individual sections (e.g., `/javascript/foundations`).
- **Data Fetching:** Server-side fetching via `lib/parser.ts` (marked as `server-only`). It queries the `questions` table in Supabase.
- **Progress Tracking:** Managed via `lib/ProgressContext.tsx` using Supabase anonymous authentication. Progress is persisted in the `progress` table.
- **Topic Registry:** `lib/topics.ts` is the single source of truth for all topics, slugs, and sections.

## Building and Running

### Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run start    # Serve production build
```

### Environment Variables

Required variables in `.env.local` (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Used for server-side operations/ETL)

## Development Conventions

- **Topic Registry:** When adding new topics or sections, update the `TOPIC_GROUPS` constant in `lib/topics.ts`.
- **Server/Client Split:** Pages are async server components. Interactive elements and progress logic are handled in client components (e.g., `SectionClient`, `DashboardClient`).
- **UI Components:** Reusable UI primitives are located in `components/ui/`.
- **Type Safety:** Heavily utilizes TypeScript interfaces for data structures (e.g., `ParsedQuestion`, `SectionMeta`).
- **Markdown Rendering:** Content is rendered with Tailwind's typography plugin (`prose` classes).

## Notes

- `CLAUDE.md` contains additional guidance for Claude Code and mentions an ETL process (`npm run etl`) which may reside in a parent repository or a different branch, as the `scripts/` directory is not present in this workspace.
- There are currently no configured tests or linting scripts.
