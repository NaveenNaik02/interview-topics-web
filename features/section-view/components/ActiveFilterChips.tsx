'use client';

import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useActiveTokens } from '../hooks';
import * as Icon from '@/components/Icons';

export const ActiveFilterChips = () => {
  const { clearFilters } = useAppStore(
    useShallow((s) => ({
      clearFilters: s.clearFilters,
    })),
  );

  const { activeTokens, hasFilters, statusFilter } = useActiveTokens();

  if (!hasFilters) return null;

  return (
    <>
      <span className="tb-divider" />
      <div className="tb-chips">
        {activeTokens.map((t) => (
          <span key={t.key} className={`f-token ${t.cls}`}>
            {t.dot ? (
              <span className="f-token-dot" />
            ) : statusFilter === 'done' ? (
              <Icon.Check />
            ) : (
              <Icon.Circle />
            )}
            {t.label}
            <button
              type="button"
              className="f-token-x"
              onClick={t.remove}
              aria-label={`Remove ${t.label} filter`}
            >
              <Icon.Close />
            </button>
          </span>
        ))}
        <button type="button" className="f-clear-all" onClick={clearFilters}>
          Clear all
        </button>
      </div>
    </>
  );
};
