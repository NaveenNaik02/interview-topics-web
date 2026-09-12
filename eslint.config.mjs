// eslint-config-next ships native flat configs directly (no FlatCompat shim
// needed — that's only for pre-flat-config shareable configs, and using it
// here throws a circular-JSON error against this version).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['design/**', 'supabase/**', '.next-local/**', '.next-remote/**'],
  },
  {
    // Plain CommonJS files (run directly via `node`, or consumed by tools
    // that only understand require()) — not part of the Next.js bundle.
    files: ['scripts/**/*.js', 'tailwind.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Line-count is a smell signal, not a hard cap — see "Component
    // conventions" in CLAUDE.md for when a file crossing this actually
    // warrants splitting. Warn-only so it surfaces in `npm run lint` without
    // failing CI; a file over 200 lines isn't broken, just worth a look.
    files: ['components/**/*.tsx', 'lib/actions/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // External packages, then `@/`-aliased internals, then relative paths,
    // as one unbroken block — the only blank line is the one after the last
    // import. Auto-fixable, so `--fix` keeps it true without anyone thinking
    // about it. `alphabetize` is deliberately off: inside a group, imports
    // are ordered so a module appears above the ones that import it, which
    // alphabetical sorting would fight.
    rules: {
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          'newlines-between': 'never',
        },
      ],
    },
  },
  {
    // These three rules come from eslint-config-next's React-Compiler-era
    // purity/component-structure checks, introduced when lint was first
    // wired into CI here — the existing codebase predates them and has many
    // legitimate one-time mount effects (reading localStorage/matchMedia
    // before first paint) and inline helper components that trip them.
    // Downgraded to warnings for now rather than rewriting ~10 files'
    // hydration-sensitive effects as a side effect of enabling CI lint;
    // revisit and tighten once those are addressed deliberately.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]

export default eslintConfig
