'use client';

import { useAppStore } from '@/lib/stores/appStore';
import type { PriorityLevel } from '@/lib/offlineSync';

const PRIORITY_OPTIONS: { k: PriorityLevel | null; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: null, label: 'None' },
];

export default function DefaultPriorityPicker({
  initial,
}: {
  initial: PriorityLevel | null;
}) {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const liveDefaultPriority = useAppStore((s) => s.defaultPriority);
  const setDefaultPriority = useAppStore((s) => s.setDefaultPriority);
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
