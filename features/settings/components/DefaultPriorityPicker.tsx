'use client';

import { useProgress } from '@/lib/context/ProgressContext';
import type { PriorityLevel } from '@/lib/offlineSync';
import { PRIORITY_OPTIONS } from './constants';

export default function DefaultPriorityPicker({
  initial,
}: {
  initial: PriorityLevel | null;
}) {
  const {
    settingsLoaded,
    defaultPriority: liveDefaultPriority,
    setDefaultPriority,
  } = useProgress();
  const defaultPriority = settingsLoaded ? liveDefaultPriority : initial;

  return (
    <div className="sort-pill-group">
      {PRIORITY_OPTIONS.map((o) => (
        <button
          key={o.label}
          className={`sort-pill ${defaultPriority === o.k ? 'on' : ''}`}
          onClick={() => setDefaultPriority(o.k)}
          aria-pressed={defaultPriority === o.k}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
