'use client';

import { useAppStore } from '@/lib/stores/appStore';
import type { PriorityLevel } from '@/lib/offlineSync';

const PRIORITY_OPTIONS: { k: PriorityLevel | null; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: null, label: 'None' },
];

const DefaultPriorityPicker = () => {
  const defaultPriority = useAppStore((s) => s.defaultPriority);
  const setDefaultPriority = useAppStore((s) => s.setDefaultPriority);

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
};

export default DefaultPriorityPicker;
