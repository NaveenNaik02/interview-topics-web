export interface SectionMeta {
  topic: string  // folder path relative to repo root, e.g. "javascript", "react/ecosystem"
  file: string   // filename without .md, e.g. "foundations", "redux"
  label: string  // display name
  custom?: boolean  // true if this row lives in the `sections` table (user-added), not the static curriculum below — only custom sections can be deleted
}

export interface TopicGroup {
  groupName: string
  slug: string  // single URL segment, e.g. "javascript"
  sections: SectionMeta[]
  blurb?: string
  custom?: boolean  // true if this row lives in the `topic_groups` table (user-added), not the static curriculum below — only custom groups can be deleted
}

export const TOPIC_GROUPS: TopicGroup[] = [
  {
    groupName: 'JavaScript',
    slug: 'javascript',
    blurb: 'Core language — scope, types, async, engines, and the DOM.',
    sections: [
      { topic: 'javascript', file: 'foundations',       label: 'Foundations' },
      { topic: 'javascript', file: 'variables',         label: 'Variables' },
      { topic: 'javascript', file: 'functions',         label: 'Functions' },
      { topic: 'javascript', file: 'objects',           label: 'Objects' },
      { topic: 'javascript', file: 'async',             label: 'Async' },
      { topic: 'javascript', file: 'modern',            label: 'Modern JS' },
      { topic: 'javascript', file: 'engines',           label: 'Engines' },
      { topic: 'javascript', file: 'performance',       label: 'Performance' },
      { topic: 'javascript', file: 'browser',           label: 'Browser & DOM' },
      { topic: 'javascript', file: 'implementations',   label: 'Implementations' },
      { topic: 'javascript', file: 'output-questions',  label: 'Output Questions' },
    ],
  },
  {
    groupName: 'React',
    slug: 'react',
    blurb: 'Hooks, rendering, architecture, and the wider ecosystem.',
    sections: [
      { topic: 'react', file: 'basics',              label: 'Basics' },
      { topic: 'react', file: 'hooks',               label: 'Hooks' },
      { topic: 'react', file: 'rendering',           label: 'Rendering' },
      { topic: 'react', file: 'architecture',        label: 'Architecture' },
      { topic: 'react', file: 'performance',         label: 'Performance' },
      { topic: 'react', file: 'scenarios',           label: 'Scenarios' },
      { topic: 'react', file: 'implementations',     label: 'Implementations' },
      { topic: 'react', file: 'output-questions',    label: 'Output Questions' },
      { topic: 'react/ecosystem', file: 'redux',               label: 'Redux' },
      { topic: 'react/ecosystem', file: 'tanstack-query',      label: 'TanStack Query' },
      { topic: 'react/ecosystem', file: 'router',              label: 'Router' },
      { topic: 'react/ecosystem', file: 'unit-testing',        label: 'Unit Testing' },
      { topic: 'react/ecosystem', file: 'mobx',                label: 'MobX' },
      { topic: 'react/ecosystem', file: 'inversify',           label: 'InversifyJS' },
      { topic: 'react/ecosystem', file: 'performance-patterns', label: 'Perf Patterns' },
      { topic: 'react/ecosystem', file: 'zustand',             label: 'Zustand' },
    ],
  },
  {
    groupName: 'Node.js',
    slug: 'node',
    blurb: 'Runtime, Express, and GraphQL.',
    sections: [
      { topic: 'node', file: 'node',     label: 'Node.js' },
      { topic: 'node', file: 'express', label: 'Express' },
      { topic: 'node', file: 'graphQL', label: 'GraphQL' },
      { topic: 'node', file: 'rest-api', label: 'REST API' },
    ],
  },
  {
    groupName: 'SQL',
    slug: 'sql',
    blurb: 'Queries, joins, indexes, and database design.',
    sections: [
      { topic: 'sql', file: 'sql', label: 'SQL' },
    ],
  },
  {
    groupName: 'Next.js',
    slug: 'next',
    blurb: 'App Router, server components, rendering modes.',
    sections: [
      { topic: 'next', file: 'next', label: 'Next.js' },
    ],
  },
  {
    groupName: 'CSS',
    slug: 'css',
    blurb: 'Layout, specificity, and modern features.',
    sections: [
      { topic: 'css', file: 'css', label: 'CSS' },
    ],
  },
  {
    groupName: 'TypeScript',
    slug: 'typescript',
    blurb: 'Types, generics, narrowing.',
    sections: [
      { topic: 'typescript', file: 'typescript', label: 'TypeScript' },
    ],
  },
  {
    groupName: 'AI',
    slug: 'ai',
    blurb: 'LLMs, tooling, and agentic patterns.',
    sections: [
      { topic: 'ai', file: 'ai', label: 'AI' },
    ],
  },
  {
    groupName: 'HTML',
    slug: 'html',
    blurb: 'Semantics and accessibility.',
    sections: [
      { topic: 'html', file: 'html', label: 'HTML' },
    ],
  },
  {
    groupName: 'Professional',
    slug: 'professional',
    blurb: 'Behavioral and engineering process questions.',
    sections: [
      { topic: 'professional', file: 'intro',        label: 'Introduction' },
      { topic: 'professional', file: 'behavioral',  label: 'Behavioral' },
      { topic: 'professional', file: 'process',     label: 'Process' },
      { topic: 'professional', file: 'agilepoint',  label: 'AgilePoint' },
      { topic: 'professional', file: 'ust-global',  label: 'UST Global' },
      { topic: 'professional', file: 'ai-workflow', label: 'AI Workflow' },
    ],
  },
]

// These all take `groups` explicitly (rather than closing over TOPIC_GROUPS)
// so callers can pass the merged static + DB-backed list from
// lib/topicsData.ts's getAllGroups() — user-added topics/subtopics need to
// resolve here too, not just the static curriculum.
export function findGroup(groups: TopicGroup[], slug: string): TopicGroup | null {
  return groups.find(g => g.slug === slug) ?? null
}

export function findSection(groups: TopicGroup[], segments: string[]): SectionMeta | null {
  const topic = segments.slice(0, -1).join('/')
  const file = segments[segments.length - 1]
  for (const group of groups) {
    const section = group.sections.find(s => s.topic === topic && s.file === file)
    if (section) return section
  }
  return null
}

export function findGroupForSection(groups: TopicGroup[], section: SectionMeta): TopicGroup | null {
  return groups.find(g =>
    g.sections.some(s => s.topic === section.topic && s.file === section.file)
  ) ?? null
}

export function sectionUrl(section: SectionMeta): string {
  return `/${section.topic}/${section.file}`
}

export function findPrevNextSections(groups: TopicGroup[], section: SectionMeta): {
  prev: SectionMeta | null
  next: SectionMeta | null
} {
  const all = groups.flatMap(g => g.sections)
  const idx = all.findIndex(s => s.topic === section.topic && s.file === section.file)
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}

// Turns a user-typed topic/subtopic name into a URL-safe slug, e.g.
// "System Design!" -> "system-design". Falls back to "topic" if nothing
// alphanumeric survives (e.g. an all-emoji name).
export function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'topic'
}

// Appends "-2", "-3", ... until `base` no longer collides with `taken`.
export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
