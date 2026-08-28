import { describe, it, expect } from 'vitest';
import { createAppStore } from './appStore';

const GROUPS = [
  {
    slug: 'js',
    groupName: 'JavaScript',
    blurb: '',
    sections: [{ topic: 'js', file: 'vars', label: 'Variables', blurb: '' }],
  },
];

describe('pruneSectionProgress', () => {
  it('drops progress for questions no longer in the section', () => {
    const store = createAppStore({ groups: GROUPS, totals: { '/js/vars': 1 } });
    store.setState({ store: { 'js/vars/u-1': true, 'js/vars/u-2': true, 'js/other/u-3': true } });

    store.getState().pruneSectionProgress('js', 'vars', ['js/vars/u-1']);

    expect(store.getState().store).toEqual({ 'js/vars/u-1': true, 'js/other/u-3': true });
    expect(store.getState().stats.bySection['/js/vars']).toEqual({ completed: 1, total: 1 });
  });
});
