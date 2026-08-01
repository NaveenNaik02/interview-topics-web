'use client';

import { Trash2, Sparkles, BookOpen } from 'lucide-react';
import { findGroupForSection, type TopicGroup } from '@/lib/topics';
import type { SetAsideItem } from '@/lib/db/setAside';
import { timeAgo } from './timeAgo';

interface Props {
  items: SetAsideItem[];
  groups: TopicGroup[];
  onRemove: (id: string) => void;
  onAssign: (item: SetAsideItem) => void;
}

export default function InboxSetAsideList({
  items,
  groups,
  onRemove,
  onAssign,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-set">
        <div className="es-title">Nothing set aside</div>
        <div className="es-sub">
          Use &quot;Set aside&quot; on a question&apos;s menu to send it here
          without deleting it.
        </div>
      </div>
    );
  }

  return (
    <div className="ic-list">
      {items.map((it) => {
        const groupName = findGroupForSection(groups, {
          topic: it.topic,
          file: it.file,
          label: it.label,
        })?.groupName;
        return (
          <div className="sa-card" key={it.id}>
            {groupName && (
              <span className="sa-crumb">
                <BookOpen />
                {groupName} › {it.label}
              </span>
            )}
            <div
              className="sa-card-q"
              dangerouslySetInnerHTML={{ __html: it.title }}
            />
            <div
              className="sa-card-a"
              dangerouslySetInnerHTML={{ __html: it.bodyHtml }}
            />
            <div className="sa-card-foot">
              <span className="ic-time" style={{ marginRight: 'auto' }}>
                set aside · {timeAgo(it.createdAt)}
              </span>
              <button className="ic-action" onClick={() => onRemove(it.id)}>
                <Trash2 size={12} />
                Discard
              </button>
              <button
                className="ic-action primary"
                onClick={() => onAssign(it)}
              >
                <Sparkles size={12} />
                Assign to a topic
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
