export interface SectionMeta {
  topic: string  // folder path relative to repo root, e.g. "javascript", "react/ecosystem"
  file: string   // filename without .md, e.g. "foundations", "redux"
  label: string  // display name
}

export interface TopicGroup {
  groupName: string
  slug: string  // single URL segment, e.g. "javascript"
  sections: SectionMeta[]
  blurb?: string
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
    ],
  },
  {
    groupName: 'Node.js',
    slug: 'node',
    blurb: 'Runtime, Express, and GraphQL.',
    sections: [
      { topic: 'node', file: 'node',    label: 'Node.js' },
      { topic: 'node', file: 'express', label: 'Express' },
      { topic: 'node', file: 'graphQL', label: 'GraphQL' },
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
      { topic: 'professional', file: 'intro',      label: 'Introduction' },
      { topic: 'professional', file: 'behavioral', label: 'Behavioral' },
      { topic: 'professional', file: 'process',    label: 'Process' },
    ],
  },
]

export function findGroup(slug: string): TopicGroup | null {
  return TOPIC_GROUPS.find(g => g.slug === slug) ?? null
}

export function findSection(segments: string[]): SectionMeta | null {
  const topic = segments.slice(0, -1).join('/')
  const file = segments[segments.length - 1]
  for (const group of TOPIC_GROUPS) {
    const section = group.sections.find(s => s.topic === topic && s.file === file)
    if (section) return section
  }
  return null
}

export function findGroupForSection(section: SectionMeta): TopicGroup | null {
  return TOPIC_GROUPS.find(g =>
    g.sections.some(s => s.topic === section.topic && s.file === section.file)
  ) ?? null
}

export function sectionUrl(section: SectionMeta): string {
  return `/${section.topic}/${section.file}`
}

export function findPrevNextSections(section: SectionMeta): {
  prev: SectionMeta | null
  next: SectionMeta | null
} {
  const all = TOPIC_GROUPS.flatMap(g => g.sections)
  const idx = all.findIndex(s => s.topic === section.topic && s.file === section.file)
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  }
}
