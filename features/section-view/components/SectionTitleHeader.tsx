import { memo, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { computeSectionStats } from '@/lib/stores/progressSelectors';
import { findSection, findGroupForSection } from '@/lib/content/topics';
import type { ParsedQuestion } from '@/lib/content/parser';

const EMPTY_ARRAY: ParsedQuestion[] = [];

const SectionTitleHeaderComponent = () => {
  const pathname = usePathname();
  const { store, mounted, questions, groups } = useAppStore(
    useShallow((s) => {
      const segments = pathname.split('/').filter(Boolean);
      const section = findSection(s.groups, segments);
      const key = section ? `/${section.topic}/${section.file}` : '';
      return {
        store: s.store,
        mounted: s.mounted,
        questions: s.sectionQuestionsCache[key] || EMPTY_ARRAY,
        groups: s.groups,
      };
    }),
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
    <>
      <div className="eyebrow">{context.groupName}</div>
      <h1 className="subtopic-title">{context.sectionLabel}</h1>
      <div className="subtopic-meta">
        <span className="meta-stat">
          <strong>{mounted ? stats.done : 0}</strong> of{' '}
          <strong>{total}</strong> complete
        </span>
        <div className="bar">
          <div
            className="bar-fill"
            style={{ width: `${mounted ? pct : 0}%` }}
          />
        </div>
        <span
          className="meta-stat"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {mounted ? pct : 0}%
        </span>
      </div>
    </>
  );
};

export const SectionTitleHeader = memo(SectionTitleHeaderComponent);
