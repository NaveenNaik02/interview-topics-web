import { memo, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { computeSectionStats } from '@/lib/stores/progressSelectors';
import { findSection, findGroupForSection } from '@/lib/topics';
import type { ParsedQuestion } from '@/lib/parser';

const EMPTY_ARRAY: ParsedQuestion[] = [];

const SectionTitleHeaderComponent = () => {
  const pathname = usePathname();
  const { store, mounted, questions, groups } = useAppStore(
    useShallow((s) => ({
      store: s.store,
      mounted: s.mounted,
      questions: s.sectionQuestionsCache[pathname] || EMPTY_ARRAY,
      groups: s.groups,
    })),
  );

  const context = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const section = findSection(groups, segments);
    if (!section) return null;
    const group = findGroupForSection(groups, section);
    return {
      groupName: group?.groupName || '',
      sectionLabel: section.label,
      topic: section.topic,
      file: section.file,
    };
  }, [pathname, groups]);

  const total = questions.length;

  const stats = useMemo(() => {
    if (!context) return { done: 0, total: 0 };
    if (!mounted) return { done: 0, total };
    return computeSectionStats(store, context.topic, context.file, total);
  }, [store, mounted, context, total]);

  if (!context) return null;

  const pct = total > 0 ? Math.round((stats.done / total) * 100) : 0;

  return (
    <div className="subtopic-title-area">
      <div className="subtopic-eyebrow">{context.groupName}</div>
      <div className="subtopic-row">
        <h1 className="subtopic-title">{context.sectionLabel}</h1>
        <div className="subtopic-progress">
          <span className="subtopic-pct">{pct}%</span>
          <div className="subtopic-bar-bg">
            <div
              className="subtopic-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="subtopic-count">
            {stats.done}/{total} done
          </span>
        </div>
      </div>
    </div>
  );
};

export const SectionTitleHeader = memo(SectionTitleHeaderComponent);
