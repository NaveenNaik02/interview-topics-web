'use client';

import { Trash2, Sparkles, Zap } from 'lucide-react';
import type { InboxItem } from '../db';
import { timeAgo } from './timeAgo';

interface Props {
  items: InboxItem[];
  onRemove: (id: string) => void;
  onAssign: (item: InboxItem) => void;
  // Same assign flow, but the AI steps run themselves — see AutoRunPipeline.
  onAutoRun: (item: InboxItem) => void;
}

export default function InboxCapturedList({
  items,
  onRemove,
  onAssign,
  onAutoRun,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="empty-set">
        <div className="es-title">Nothing here yet</div>
        <div className="es-sub">
          Use &quot;Save a question&quot; above to capture something without
          picking a topic first.
        </div>
      </div>
    );
  }

  return (
    <div className="ic-list">
      {items.map((it) => (
        <div className="ic-card" key={it.id}>
          <div className="ic-card-top">
            <span className="ic-time">{timeAgo(it.createdAt)}</span>
          </div>
          <p className="ic-card-text">{it.text}</p>
          <div className="ic-card-actions">
            <button className="ic-action" onClick={() => onRemove(it.id)}>
              <Trash2 size={12} />
              Discard
            </button>
            <button className="ic-action auto" onClick={() => onAutoRun(it)}>
              <Zap size={12} />
              Auto-run
            </button>
            <button className="ic-action primary" onClick={() => onAssign(it)}>
              <Sparkles size={12} />
              Assign
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
