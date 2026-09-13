'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { findGroup } from '@/lib/content/topics';
import type { ShortlistFlag } from '@/lib/db/shortlist';
import { useAppStore } from '@/lib/stores/appStore';
import { TopicHeader, TopicBulkBar, SubtopicList } from './components';
import type { Dialog } from './types';

const TopicDialogs = dynamic(
  () => import('./components/TopicDialogs').then((m) => m.TopicDialogs),
  { ssr: false },
);

interface Props {
  slug: string;
  flagIds: Record<ShortlistFlag, string[]>;
}

export const TopicOverview = ({ slug, flagIds }: Props) => {
  const groups = useAppStore((s) => s.groups);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const group = findGroup(groups, slug);
  if (!group) return null;

  return (
    <div className="content-wrapper">
      <TopicHeader group={group} onDialog={setDialog} />
      <TopicBulkBar flagIds={flagIds} onDialog={setDialog} />
      <SubtopicList group={group} onDialog={setDialog} />

      {dialog && (
        <TopicDialogs
          dialog={dialog}
          group={group}
          flagIds={flagIds}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
};
