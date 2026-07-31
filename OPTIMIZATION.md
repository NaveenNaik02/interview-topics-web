# Prep Tracker Application Optimization Report

This document outlines the current architectural status of the application, analyzes performance characteristics, and identifies specific areas for optimization and cleanup.

---

## 📊 Current Status of the App

The application is structured as a **Next.js 16 (App Router)** and **Supabase (PostgreSQL)** client-server app. It is designed to act as an offline-first PWA for technical interview topic tracking.

### 1. Framework & Rendering
- **Static & Dynamic Mix**: Uses `generateStaticParams` for build-time generation with `revalidate = 3600` (hourly ISR).
- **Server Actions**: Server actions (`lib/actions/`) handle mutations and trigger `revalidatePath` to refresh the ISR cache.
- **Dynamic Imports**: Successfully dynamic-imports heavy client components like `AddQuestionModal` and `InboxCaptureModal` using `next/dynamic` with `ssr: false`, preventing initial bundle bloat.

### 2. State Management
- **Zustand Store**: Global client state is centralized in `useAppStore` (`lib/stores/appStore.ts`) using separate slices for auth, progress, settings, starred, priority, and offline management.
- **Context API**: React Context is utilized for static, server-memoized values (`TopicsContext`, `TotalsContext`) and layout-related UI states (`ThemeContext`, `FontSizeContext`).
- **Compatibility Layer**: [ProgressContext.tsx](file:///Users/naveennaik/Projects/interview/web/lib/ProgressContext.tsx) serves as a compatibility shim to adapt Zustand state to old consumer components.

### 3. PWA & Offline Services
- **Service Worker**: Uses a custom, hand-written Service Worker (`public/sw.js`) to cache page components and Supabase queries.
- **Queue System**: Progress and priority updates are queued locally in `localStorage` when offline and replayed via bulk server actions when connection is restored.

---

## 🔍 Areas for Improvement & Optimization

### 1. 🔴 React Render Thrashing in the `useProgress` Shim
- **The Issue**: Almost every consumer of global state imports the `useProgress` helper from [ProgressContext.tsx](file:///Users/naveennaik/Projects/interview/web/lib/ProgressContext.tsx) and destructures up to 20+ properties. Inside `useProgress`, a massive selector pulls the entire store:
  ```typescript
  const state = useAppStore(useShallow(s => ({
    store: s.store,
    totals: s.totals,
    mounted: s.mounted,
    // ...almost the entire app store
  })))
  ```
  Additionally, `useProgress` returns a newly allocated object literal `{ ...rest, stats, isComplete, ... }` on every render. As a result, when **any** user setting, priority, or completed flag changes, every component calling `useProgress()` (such as `SectionClient`, `PriorityMixClient`, and `Sidebar`) completely re-renders.
- **Optimization**: 
  - Migrate components to use **granular Zustand selectors** directly instead of destructuring the legacy context shim. For example:
    ```typescript
    // Re-renders ONLY when 'toggle' action is needed (which is referentially stable and never causes re-renders)
    const toggle = useAppStore(s => s.toggle);
    
    // Re-renders ONLY if this specific question completion status changes
    const isDone = useAppStore(s => !!s.store[qid]);
    ```

### 2. 🟡 Deferring Card Rendering with `content-visibility`
- **The Issue**: Long sections containing dozens of question cards (`QuestionItem` inside `.questions-list`) render all DOM nodes synchronously. This increases initial layout costs, slows down page navigation, and results in a large DOM tree.
- **Optimization**:
  - Implement modern CSS `content-visibility: auto` paired with `contain-intrinsic-size` on question cards that are initially rendered below the viewport.
  - Since applying this above-the-fold delays page render, apply a conditional class based on render index:
    ```typescript
    processed.map(({ q, priority }, index) => (
      <div 
        key={q.id} 
        className={index > 4 ? 'content-visibility-auto' : ''}
      >
        <QuestionItem {...props} />
      </div>
    ))
    ```
  - Define utility styles in CSS:
    ```css
    .content-visibility-auto {
      content-visibility: auto;
      contain-intrinsic-size: auto 64px; /* Estimated height of a closed card */
    }
    ```

### 3. 🟡 Dead Dependency Cleanup (Serwist PWA)
- **The Issue**: The dependencies `@serwist/next` and `serwist` are declared in `package.json` and compiled, but the app uses a custom `/sw.js` and does not wrap `next.config.js` with Serwist configurations. This increases download/install times and causes developer confusion.
- **Optimization**:
  - Remove `@serwist/next` and `serwist` dependencies from `package.json`.
  - Delete any legacy configs if present, keeping the codebase lean.

### 4. 🟢 Image LCP (Largest Contentful Paint) Optimization
- **The Issue**: The user avatar in [Topbar.tsx](file:///Users/naveennaik/Projects/interview/web/components/Topbar.tsx) is rendered as a standard `<img>` without priority hints.
- **Optimization**:
  - Add `fetchpriority="high"` to the logged-in user's avatar image to improve the LCP timing on initial dashboard visits.
    ```typescript
    <img src={avatarUrl} alt="" fetchpriority="high" referrerPolicy="no-referrer" />
    ```

---

## 📈 Summary of Proposed Improvements

| Improvement | Target File / Area | Impact | Priority |
| :--- | :--- | :--- | :--- |
| **Granular Selectors** | `components/SectionClient.tsx`, `PriorityMixClient.tsx` | High (Reduces global component re-renders) | **Critical** |
| **`content-visibility`** | `components/SectionClient.tsx` / `app/globals.css` | Medium (Improves interaction readiness / initial paint) | **Medium** |
| **Unused Deps Removal** | `package.json` | Low (Shrinks setup footprint / build step complexity) | **Medium** |
| **LCP Fetch Priority** | `components/Topbar.tsx` | Low (Improves Core Web Vitals score) | **Low** |
