import type { SectionMeta } from '@/lib/content/topics';
import type { ShortlistFlag } from '@/lib/db/shortlist';

export type Dialog =
  | { kind: 'add' }
  | { kind: 'rename-topic' }
  | { kind: 'rename-section'; section: SectionMeta }
  | { kind: 'delete-topic' }
  | { kind: 'delete-section'; section: SectionMeta }
  | { kind: 'clear-flag'; flag: ShortlistFlag };
