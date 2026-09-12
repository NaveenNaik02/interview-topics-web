export interface SectionMeta {
  topic: string; // folder path relative to repo root, e.g. "javascript", "react/ecosystem"
  file: string; // filename without .md, e.g. "foundations", "redux"
  label: string; // display name
}

export interface TopicGroup {
  groupName: string;
  slug: string; // single URL segment, e.g. "javascript"
  sections: SectionMeta[];
  blurb?: string;
}

// A topic's code-output subtopic is an ordinary `sections` row created from
// Add Subtopic's toggle, but its `file` is always this reserved slug rather
// than one derived from the name the user typed. The underscore is
// deliberate: slugify() collapses every non-alphanumeric character to "-", so
// no ordinary subtopic can ever produce it — it can't collide with the
// pre-existing "output-questions" sections, which stay ordinary subtopics.
// sections' primary key is (topic, file), so this also caps a topic at one.
export const CODE_OUTPUT_FILE = 'code_output';
export const CODE_OUTPUT_LABEL = 'Code Output';

export function isCodeOutputSection(section: SectionMeta): boolean {
  return section.file === CODE_OUTPUT_FILE;
}

export function findGroup(
  groups: TopicGroup[],
  slug: string,
): TopicGroup | null {
  return groups.find((g) => g.slug === slug) ?? null;
}

export function sectionPath(
  segments: string[],
): Pick<SectionMeta, 'topic' | 'file'> {
  return {
    topic: segments.slice(0, -1).join('/'),
    file: segments[segments.length - 1],
  };
}

export function findSection(
  groups: TopicGroup[],
  segments: string[],
): SectionMeta | null {
  const { topic, file } = sectionPath(segments);
  for (const group of groups) {
    const section = group.sections.find(
      (s) => s.topic === topic && s.file === file,
    );
    if (section) return section;
  }
  return null;
}

export function findGroupForSection(
  groups: TopicGroup[],
  section: SectionMeta,
): TopicGroup | null {
  return (
    groups.find((g) =>
      g.sections.some(
        (s) => s.topic === section.topic && s.file === section.file,
      ),
    ) ?? null
  );
}

export function sectionUrl(section: SectionMeta): string {
  return `/${section.topic}/${section.file}`;
}

export function findPrevNextSections(
  groups: TopicGroup[],
  section: SectionMeta,
): {
  prev: SectionMeta | null;
  next: SectionMeta | null;
} {
  const all = groups.flatMap((g) => g.sections);
  const idx = all.findIndex(
    (s) => s.topic === section.topic && s.file === section.file,
  );
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'topic'
  );
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
