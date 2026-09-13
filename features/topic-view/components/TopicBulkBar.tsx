'use client';

import type { ShortlistFlag } from '@/lib/db/shortlist';
import { Icon } from '@/components/SidebarIcons';
import { FLAGS, FLAG_COPY } from '../flagCopy';
import type { Dialog } from '../types';

interface Props {
  flagIds: Record<ShortlistFlag, string[]>;
  onDialog: (dialog: Dialog) => void;
}

export const TopicBulkBar = ({ flagIds, onDialog }: Props) => {
  const flagsPresent = FLAGS.filter((flag) => flagIds[flag].length > 0);

  return (
    <div className="tv-h-bulkbar">
      <button className="action-chip" onClick={() => onDialog({ kind: 'add' })}>
        <Icon.Plus /> Add subtopic
      </button>
      {flagsPresent.map((flag) => {
        const { confirm, icon: FlagIcon } = FLAG_COPY[flag];
        return (
          <button
            key={flag}
            className="action-chip"
            onClick={() => onDialog({ kind: 'clear-flag', flag })}
          >
            <FlagIcon /> {confirm}
          </button>
        );
      })}
    </div>
  );
};
