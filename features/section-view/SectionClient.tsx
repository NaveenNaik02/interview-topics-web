'use client';

import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import type { ParsedQuestion } from '@/lib/content/parser';
import { type SectionMeta } from '@/lib/content/topics';
import { useSectionFilters } from './hooks';
import { SectionTitleHeader } from './components/SectionTitleHeader';
import FilterSortToolbar from './components/FilterSortToolbar';
import QuestionList from './components/QuestionList';

const NO_ORDER: Record<string, number> = {};

interface Props {
  section: SectionMeta;
  questions: ParsedQuestion[];
  initialOrder?: Record<string, number>;
}

export default function SectionClient({
  section,
  questions: serverQuestions,
  initialOrder = NO_ORDER,
}: Props) {
  const currentUrl = `/${section.topic}/${section.file}`;

  const {
    setSectionQuestions,
    questions,
  } = useAppStore(
    useShallow((s) => ({
      setSectionQuestions: s.setSectionQuestions,
      questions: s.sectionQuestionsCache[currentUrl] || serverQuestions,
    })),
  );

  // Sync server questions and totals into Zustand store on mount or url change
  useEffect(() => {
    setSectionQuestions(serverQuestions, section);
  }, [currentUrl, serverQuestions, section, setSectionQuestions]);

  const { processed, reorderable } = useSectionFilters(
    section,
    questions,
    initialOrder,
  );

  return (
    <div className="content-wrapper">
      <div className="subtopic-header">
        <SectionTitleHeader />
        <FilterSortToolbar />
      </div>

      <QuestionList
        processed={processed}
        reorderable={reorderable}
        section={section}
      />
    </div>
  );
}
