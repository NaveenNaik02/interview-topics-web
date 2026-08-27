'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { setGreyZone } from '@/lib/actions/questionFlags';
import { QuestionShortlist } from '@/components/QuestionShortlist';
import type { ShortlistQuestion } from '@/lib/db/shortlist';

interface Props {
  questions: ShortlistQuestion[];
}

// One topic's worth of grey-zone questions — the page does the grouping
// server-side and hands the rows down. All this owns is what "remove" means.
export const GreyZoneClient = ({ questions }: Props) => {
  const bumpFlagCount = useAppStore((s) => s.bumpFlagCount);

  const clearGreyZone = useCallback(
    async (id: string) => {
      await setGreyZone(id, false);
      bumpFlagCount('grey_zone', -1);
    },
    [bumpFlagCount],
  );

  return (
    <QuestionShortlist
      questions={questions}
      flag="grey_zone"
      onRemove={clearGreyZone}
    />
  );
};
