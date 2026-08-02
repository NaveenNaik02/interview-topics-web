---
name: barrel-exports
description: Enforces barrel-export (index.ts/index.tsx) conventions for this codebase's own modules. Use when creating a new folder under components/, lib/, or lib/actions/ that will contain more than one related file, or when adding files to an existing multi-file feature folder that lacks an index.
metadata:
  type: convention
  version: '1.0.0'
---

# Barrel Exports

When a folder under `components/`, `lib/`, or `lib/actions/` contains (or will contain) more than one related file, give it an `index.ts` (or `index.tsx` if it exports JSX) that re-exports the folder's public members. Consumers import from the folder path, not from a deep file path.

**Correct:**

```
components/AddQuestionModal/
  index.tsx          # export { AddQuestionModal } from './AddQuestionModal'
  AddQuestionModal.tsx
  MarkdownField.tsx
  useAiActions.ts
```

```ts
import { AddQuestionModal } from '@/components/AddQuestionModal';
```

**Incorrect:**

```ts
import { AddQuestionModal } from '@/components/AddQuestionModal/AddQuestionModal';
```

Rules:

- Single-file modules don't need a barrel — don't create `index.ts` just to re-export one thing from one file.
- The barrel only re-exports what's meant to be public. Internal helpers (a hook only used by one sibling, a types file) stay unexported from the barrel and get imported directly by siblings within the same folder.
- Applies to this codebase's own code (feature folders, action groups, store slices). It does **not** apply to importing from third-party packages — see `bundle-barrel-imports.md` in the `vercel-react-best-practices` skill, which covers a different problem (avoiding large third-party re-export hubs like `lucide-react`/`@mui/material` for tree-shaking/build-speed reasons). Keep first-party barrels small and thin; that guidance and this one aren't in tension.
- The barrel is for outside consumers only. A file importing a sibling in its own folder uses a direct relative import (`./EmailLoginForm`), never the `@/...`-aliased barrel path (`@/features/login/components`) — going through the barrel to reach your own neighbor is an unnecessary indirection and risks a self-import cycle once that folder's `index.ts` re-exports the very file doing the importing.

  **Correct** (`features/login/components/LoginForm.tsx` importing its sibling):

  ```ts
  import EmailLoginForm from './EmailLoginForm';
  ```

  **Incorrect:**

  ```ts
  import { EmailLoginForm } from '@/features/login/components';
  ```
