'use client';

import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import type { Dialog } from '../types';
import { SubtopicRow } from './SubtopicRow';

interface Props {
  group: TopicGroup;
  onDialog: (dialog: Dialog) => void;
}

export const SubtopicList = ({ group, onDialog }: Props) => {
  return (
    <div className="tv-h-list">
      {group.sections.map((s) => (
        <SubtopicRow
          key={sectionUrl(s)}
          section={s}
          onRename={(section) => onDialog({ kind: 'rename-section', section })}
          onDelete={(section) => onDialog({ kind: 'delete-section', section })}
        />
      ))}
    </div>
  );
};
