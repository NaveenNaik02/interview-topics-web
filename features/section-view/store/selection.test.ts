import { describe, it, expect } from 'vitest';
import { createAppStore } from '@/lib/stores/appStore';

describe('multi-select', () => {
  it('toggles ids on and off, and clears with the mode', () => {
    const store = createAppStore({ groups: [], totals: {} });

    store.getState().toggleSelectMode();
    store.getState().toggleSelected('js/vars/u-1');
    store.getState().toggleSelected('js/vars/u-2');
    store.getState().toggleSelected('js/vars/u-1');

    expect(store.getState().selectMode).toBe(true);
    expect([...store.getState().selectedIds]).toEqual(['js/vars/u-2']);

    store.getState().setSelected(['a', 'b']);
    expect([...store.getState().selectedIds]).toEqual(['a', 'b']);

    store.getState().clearSelection();

    expect(store.getState().selectMode).toBe(false);
    expect(store.getState().selectedIds.size).toBe(0);
  });
});
