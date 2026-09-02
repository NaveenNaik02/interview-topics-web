import { describe, it, expect } from 'vitest';
import { buildRows } from './buildRows';
import type { ShortlistQuestion } from '@/lib/db/shortlist';
import type { TopicGroup } from '@/lib/content/topics';

function makeQuestion(
  overrides: Partial<ShortlistQuestion> = {},
): ShortlistQuestion {
  return {
    id: 'q1',
    number: 1,
    title: 'Title',
    bodyHtml: '<p>body</p>',
    createdBy: 'user-1',
    topic: 'react',
    file: 'hooks',
    label: 'Hooks',
    groupSlug: 'react',
    priority: null,
    ...overrides,
  };
}

const groups: TopicGroup[] = [
  {
    slug: 'react',
    groupName: 'React',
    sections: [{ topic: 'react', file: 'hooks', label: 'Hooks' }],
  },
];

describe('buildRows', () => {
  it('derives section/subKey/topicLabel from the group lookup', () => {
    const [row] = buildRows([makeQuestion()], groups, true, {
      id: 'user-1',
    } as never);
    expect(row.section).toEqual({
      topic: 'react',
      file: 'hooks',
      label: 'Hooks',
    });
    expect(row.topicLabel).toBe('React');
  });

  it('falls back to groupSlug when the group is missing', () => {
    const [row] = buildRows(
      [makeQuestion({ topic: 'unknown', groupSlug: 'orphan' })],
      groups,
      true,
      { id: 'user-1' } as never,
    );
    expect(row.topicLabel).toBe('orphan');
  });

  it('canManage is true only once mounted, signed in, and owning the question', () => {
    const q = makeQuestion({ createdBy: 'user-1' });
    expect(
      buildRows([q], groups, false, { id: 'user-1' } as never)[0]
        .canManage,
    ).toBe(false);
    expect(buildRows([q], groups, true, null)[0].canManage).toBe(false);
    expect(
      buildRows([q], groups, true, { id: 'someone-else' } as never)[0]
        .canManage,
    ).toBe(false);
    expect(
      buildRows([q], groups, true, { id: 'user-1' } as never)[0]
        .canManage,
    ).toBe(true);
  });

  it('canManage is true for admins regardless of ownership', () => {
    const q = makeQuestion({ createdBy: 'someone-else' });
    const admin = { id: 'user-1', app_metadata: { is_admin: true } } as never;
    expect(buildRows([q], groups, true, admin)[0].canManage).toBe(true);
  });
});
