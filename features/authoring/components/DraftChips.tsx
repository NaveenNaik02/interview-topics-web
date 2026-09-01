'use client';

import type { AnswerVersion } from '../types';

// The row of switchable generated drafts, under both the Answer field and the
// code-output Explanation field. Rendering nothing for an empty list keeps
// the `versions.length >= 1` check out of every caller.
export const DraftChips = ({
  versions,
  activeId,
  onSelect,
  disabled,
}: {
  versions: AnswerVersion[];
  activeId: string | null;
  onSelect: (v: AnswerVersion) => void;
  // Set while a generation is still revealing text: the typewriter writes
  // straight to the field on a timer, so a selection made now is overwritten
  // by its next tick — the chip would look active over the wrong text.
  disabled?: boolean;
}) => {
  if (!versions.length) return null;

  return (
    <div className="aq-version-row">
      <span className="aq-version-label">Drafts:</span>
      {versions.map((v) => (
        <button
          type="button"
          key={v.id}
          className={`aq-version-chip ${activeId === v.id ? 'active' : ''}`}
          onClick={() => onSelect(v)}
          disabled={disabled}
          title={v.text.slice(0, 140)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};
