'use client';

import { useState } from 'react';
import { useProgress } from '@/lib/context/ProgressContext';
import { useTopicGroups } from '@/lib/context/TopicsContext';
import type { SetAsideItem } from '@/lib/db/setAside';
import AddQuestionModal from '@/components/AddQuestionModal';
import type { InboxItem } from '../db';
import InboxCapturedList from './InboxCapturedList';
import InboxSetAsideList from './InboxSetAsideList';

type Tab = 'captured' | 'aside';

interface Props {
  inboxItems: InboxItem[];
  setAsideItems: SetAsideItem[];
}

export default function InboxClient({
  inboxItems: serverInboxItems,
  setAsideItems: serverSetAsideItems,
}: Props) {
  const {
    inboxItems: liveInboxItems,
    setAsideItems: liveSetAsideItems,
    mounted,
    removeInboxItem,
    removeSetAsideItem,
  } = useProgress();
  const groups = useTopicGroups();
  const [tab, setTab] = useState<Tab>('captured');
  const [assigning, setAssigning] = useState<InboxItem | null>(null);
  const [assigningAside, setAssigningAside] = useState<SetAsideItem | null>(
    null,
  );

  // Pre-mount, render the server-fetched snapshot so the page has real
  // content on first paint instead of blanking until the Zustand store
  // hydrates — same pattern as StarredClient's `mounted ? live : server`.
  const inboxItems = mounted ? liveInboxItems : serverInboxItems;
  const setAsideItems = mounted ? liveSetAsideItems : serverSetAsideItems;

  return (
    <>
      <div className="ic-tabs">
        <button
          type="button"
          className={`ic-tab ${tab === 'captured' ? 'active' : ''}`}
          onClick={() => setTab('captured')}
        >
          Captured<span className="ic-tab-count">{inboxItems.length}</span>
        </button>
        <button
          type="button"
          className={`ic-tab ${tab === 'aside' ? 'active' : ''}`}
          onClick={() => setTab('aside')}
        >
          Set aside<span className="ic-tab-count">{setAsideItems.length}</span>
        </button>
      </div>

      {tab === 'captured' ? (
        <InboxCapturedList
          items={inboxItems}
          onRemove={removeInboxItem}
          onAssign={setAssigning}
        />
      ) : (
        <InboxSetAsideList
          items={setAsideItems}
          groups={groups}
          onRemove={removeSetAsideItem}
          onAssign={setAssigningAside}
        />
      )}

      {assigning && (
        <AddQuestionModal
          prefillTitle={assigning.text}
          fromInboxId={assigning.id}
          onClose={() => setAssigning(null)}
          onSaved={() => setAssigning(null)}
        />
      )}

      {assigningAside && (
        <AddQuestionModal
          defaultSection={{
            topic: assigningAside.topic,
            file: assigningAside.file,
            label: assigningAside.label,
          }}
          prefillTitle={assigningAside.title}
          prefillMarkdown={assigningAside.markdown}
          prefillLang={assigningAside.lang}
          prefillTags={assigningAside.tags}
          prefillProblem={assigningAside.problem}
          fromSetAsideId={assigningAside.id}
          onClose={() => setAssigningAside(null)}
          onSaved={() => setAssigningAside(null)}
        />
      )}
    </>
  );
}
