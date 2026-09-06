'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionMeta, findGroup, sectionUrl } from '@/lib/content/topics';
import type { ShortlistFlag } from '@/lib/db/shortlist';
import { useAppStore } from '@/lib/stores/appStore';
import { useProgressStats } from '@/lib/hooks';
import {
  renameTopicGroup,
  renameSection,
  deleteSection,
  deleteTopicGroup,
} from '@/lib/actions/topics';
import { bulkSetFlag } from '@/lib/actions/questionFlags';
import { Icon } from '@/components/SidebarIcons';
import ConfirmDialog from '@/components/ConfirmDialog';
import AddTopicModal from '@/components/AddTopicModal';
import { RenameDialog, SubtopicRow } from './components';

type Dialog =
  | { kind: 'add' }
  | { kind: 'rename-topic' }
  | { kind: 'rename-section'; section: SectionMeta }
  | { kind: 'delete-topic' }
  | { kind: 'delete-section'; section: SectionMeta }
  | { kind: 'clear-flag'; flag: ShortlistFlag };

const FLAG_COPY: Record<
  ShortlistFlag,
  { title: string; confirm: string; where: string }
> = {
  starred: {
    title: 'Unstar all?',
    confirm: 'Unstar all',
    where: 'your Starred shortlist',
  },
  grey_zone: {
    title: 'Clear grey zone?',
    confirm: 'Clear grey zone',
    where: 'the Grey Zone',
  },
};

interface Props {
  slug: string;
  // Fetched server-side: the store only carries global flag *counts*, and
  // both the button's visibility and bulkSetFlag need the ids themselves.
  flagIds: Record<ShortlistFlag, string[]>;
}

export const TopicOverview = ({ slug, flagIds }: Props) => {
  const router = useRouter();
  // Read the group from the store rather than taking it as a prop — a rename
  // lands here through StoreProvider's groups re-sync on router.refresh().
  const groups = useAppStore((s) => s.groups);
  const bumpFlagCount = useAppStore((s) => s.bumpFlagCount);
  const stats = useProgressStats();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const group = findGroup(groups, slug);
  if (!group) return null;

  const { completed, total } = group.sections.reduce(
    (acc, s) => {
      const sec = stats.bySection[sectionUrl(s)];
      return sec
        ? {
            completed: acc.completed + sec.completed,
            total: acc.total + sec.total,
          }
        : acc;
    },
    { completed: 0, total: 0 },
  );
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const close = () => {
    setDialog(null);
    setError(null);
  };

  // Every mutation below ends in router.refresh() — the server re-reads
  // getAllGroups()/fetchTopicFlagIds() and the store re-syncs from it.
  const save = async (fn: () => Promise<void>) => {
    await fn();
    close();
    router.refresh();
  };

  // ConfirmDialog has no error state of its own, so this owns it. RenameDialog
  // does, and calls `save` directly — swallowing here would leave its Save
  // button stuck on "Saving…" with nothing rendered to explain why.
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await save(fn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const clearFlag = (flag: ShortlistFlag) => {
    const ids = flagIds[flag];
    return run(async () => {
      await bulkSetFlag(ids, flag, false);
      bumpFlagCount(flag, -ids.length);
    });
  };

  return (
    <div className="content-wrapper">
      <div className="tv-h-head">
        <div
          className="tv-h-ring"
          style={{ '--p': pct } as React.CSSProperties}
        >
          <span>{pct}%</span>
        </div>
        <div className="tv-h-title">
          <div className="tv-h-name">{group.groupName}</div>
          {group.blurb && <p className="tv-h-blurb">{group.blurb}</p>}
          <p className="tv-h-meta">
            {total} question{total === 1 ? '' : 's'} · {completed}/{total} done
          </p>
        </div>
        <div className="tv-h-toolbar">
          <button
            className="tv-h-ghost"
            title="Rename topic"
            aria-label="Rename topic"
            onClick={() => setDialog({ kind: 'rename-topic' })}
          >
            <Icon.Edit />
          </button>
          <button
            className="tv-h-ghost danger"
            title="Delete topic"
            aria-label="Delete topic"
            onClick={() => setDialog({ kind: 'delete-topic' })}
          >
            <Icon.Trash />
          </button>
        </div>
      </div>

      <div className="tv-h-bulkbar">
        <button
          className="action-chip"
          onClick={() => setDialog({ kind: 'add' })}
        >
          <Icon.Plus /> Add subtopic
        </button>
        {flagIds.starred.length > 0 && (
          <button
            className="action-chip"
            onClick={() => setDialog({ kind: 'clear-flag', flag: 'starred' })}
          >
            <Icon.Star /> Unstar all
          </button>
        )}
        {flagIds.grey_zone.length > 0 && (
          <button
            className="action-chip"
            onClick={() => setDialog({ kind: 'clear-flag', flag: 'grey_zone' })}
          >
            <Icon.GreyZone /> Clear grey zone
          </button>
        )}
      </div>

      <div className="tv-h-list">
        {group.sections.map((s) => (
          <SubtopicRow
            key={sectionUrl(s)}
            section={s}
            onRename={(section) =>
              setDialog({ kind: 'rename-section', section })
            }
            onDelete={(section) =>
              setDialog({ kind: 'delete-section', section })
            }
          />
        ))}
      </div>

      {dialog?.kind === 'add' && (
        <AddTopicModal
          initialMode="subtopic"
          initialGroupSlug={group.slug}
          onClose={close}
          onSaved={() => {
            close();
            router.refresh();
          }}
        />
      )}

      {dialog?.kind === 'rename-topic' && (
        <RenameDialog
          title="Rename topic"
          label="Topic name"
          initialName={group.groupName}
          initialBlurb={group.blurb ?? ''}
          onSave={(name, blurb) =>
            save(() => renameTopicGroup(group.slug, name, blurb))
          }
          onClose={close}
        />
      )}

      {dialog?.kind === 'rename-section' && (
        <RenameDialog
          title="Rename subtopic"
          label="Subtopic name"
          initialName={dialog.section.label}
          onSave={(name) =>
            save(() =>
              renameSection(dialog.section.topic, dialog.section.file, name),
            )
          }
          onClose={close}
        />
      )}

      <ConfirmDialog
        open={dialog?.kind === 'delete-topic'}
        danger
        requireText={group.groupName}
        title="Delete topic?"
        message={`This removes “${group.groupName}” and all its subtopics. Topics with questions can't be deleted — move or delete its questions first.`}
        confirmLabel="Delete topic"
        error={error}
        onConfirm={() =>
          run(async () => {
            await deleteTopicGroup(group.slug);
            router.replace('/');
          })
        }
        onCancel={close}
      />

      <ConfirmDialog
        open={dialog?.kind === 'delete-section'}
        danger
        title="Delete subtopic?"
        message={
          dialog?.kind === 'delete-section'
            ? `This removes “${dialog.section.label}” from “${group.groupName}”. This can't be undone.`
            : ''
        }
        confirmLabel="Delete subtopic"
        error={error}
        onConfirm={() =>
          dialog?.kind === 'delete-section'
            ? run(() =>
                deleteSection(dialog.section.topic, dialog.section.file),
              )
            : undefined
        }
        onCancel={close}
      />

      <ConfirmDialog
        open={dialog?.kind === 'clear-flag'}
        title={
          dialog?.kind === 'clear-flag' ? FLAG_COPY[dialog.flag].title : ''
        }
        message={
          dialog?.kind === 'clear-flag'
            ? `This removes ${flagIds[dialog.flag].length} question${
                flagIds[dialog.flag].length === 1 ? '' : 's'
              } in “${group.groupName}” from ${FLAG_COPY[dialog.flag].where}.`
            : ''
        }
        confirmLabel={
          dialog?.kind === 'clear-flag' ? FLAG_COPY[dialog.flag].confirm : ''
        }
        error={error}
        onConfirm={() =>
          dialog?.kind === 'clear-flag' ? clearFlag(dialog.flag) : undefined
        }
        onCancel={close}
      />
    </div>
  );
};
