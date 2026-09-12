'use client';

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import * as Icon from '@/components/Icons';
import { useActiveTokens } from '../hooks';


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
    </>
  );
};
