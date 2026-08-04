'use client';

import { useState } from 'react';
import type { SetAsideItem } from '@/lib/db/setAside';
import type { InboxItem } from '../db';
import { useServerSyncedList } from '../hooks/useServerSyncedList';
import InboxCapturedSection from './InboxCapturedSection';
import InboxSetAsideSection from './InboxSetAsideSection';

type Tab = 'captured' | 'aside';

interface Props {
  inboxItems: InboxItem[];
  setAsideItems: SetAsideItem[];
}

export default function InboxClient({
  inboxItems: serverInboxItems,
  setAsideItems: serverSetAsideItems,
}: Props) {
  // Local list state, not the global store (which only tracks a count for
  // the Sidebar badge — see InboxSlice). Kept in this parent, not pushed
  // into the section components below, because both tab buttons need both
  // counts at once.
  const [inboxItems, removeInboxItemFromList] =
    useServerSyncedList(serverInboxItems);
  const [setAsideItems, removeSetAsideItemFromList] =
    useServerSyncedList(serverSetAsideItems);
  const [tab, setTab] = useState<Tab>('captured');

  const tabs = [
    ['captured', 'Captured', inboxItems.length],
    ['aside', 'Set aside', setAsideItems.length],
  ] as const;

  return (
    <>
      <div className="ic-tabs">
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`ic-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
            <span className="ic-tab-count">{count}</span>
          </button>
        ))}
      </div>

      {tab === 'captured' ? (
        <InboxCapturedSection
          items={inboxItems}
          onRemoveItem={removeInboxItemFromList}
        />
      ) : (
        <InboxSetAsideSection
          items={setAsideItems}
          onRemoveItem={removeSetAsideItemFromList}
        />
      )}
    </>
  );
}
