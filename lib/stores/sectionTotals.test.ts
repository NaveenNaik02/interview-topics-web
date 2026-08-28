import { describe, it, expect } from 'vitest';
import { createAppStore } from './appStore';

const GROUPS = [
  {
    slug: 'js',
    groupName: 'JavaScript',
    blurb: '',
    sections: [
      { topic: 'js', file: 'vars', label: 'Variables', blurb: '' },
      { topic: 'js', file: 'async', label: 'Async', blurb: '' },
    ],
  },
];

const SECTION = { topic: 'js', file: 'vars', label: 'Variables', blurb: '' };
const question = (id: string) => ({ id }) as never;

describe('section totals feed the sidebar stats', () => {
  it('recomputes stats when a section loses a question', () => {
    const store = createAppStore({
      groups: GROUPS,
      totals: { '/js/vars': 2, '/js/async': 0 },
    });

    store.getState().setSectionQuestions([question('js/vars/u-1')], SECTION);

    expect(store.getState().stats.bySection['/js/vars'].total).toBe(1);
  });
});
